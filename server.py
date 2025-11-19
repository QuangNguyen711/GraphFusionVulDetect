import os
import json
import tempfile
import traceback
import logging
from pathlib import Path
from typing import TypedDict, List, Dict, Any

import dgl
import torch
import torch.nn.functional as F
import networkx as nx
from transformers import RobertaTokenizer, RobertaModel
from langchain_openai import ChatOpenAI
from src.utils.helper import seed_everything, prepare_solc_artifacts
from src.model.GraphClasifier import GraphNN
from src.model.NodeDetector import NodeClassifierGNN
from src.graph.builder import build_graph
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from anyio import to_thread
import dotenv

dotenv.load_dotenv()

# --- Suppress Slither's verbose output ---
os.environ['SLITHER_LOG_LEVEL'] = 'CRITICAL'


# ==============================================================================
# 1. SETUP: Logging, Device, and Helper Functions
# ==============================================================================

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("Slither-API")

# Use CUDA if available, otherwise CPU
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
logger.info(f"Using device: {device}")

seed_everything(42)
prepare_solc_artifacts()

logger.info("Loading models...")

EMBEDD_MODEL_PATH = os.getenv("EMBEDDING_MODEL_PATH")
GRAPH_VUL_MODEL_PATH = os.getenv("GRAPH_VUL_MODEL_PATH")
NODE_VUL_MODEL_PATH = os.getenv("NODE_VUL_MODEL_PATH")

MODEL_NAME = os.getenv("MODEL_NAME")
BASE_URL = os.getenv("BASE_URL")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Load the embedding tokenizer and model
embedd_tokenizer = RobertaTokenizer.from_pretrained(EMBEDD_MODEL_PATH)
embedd_model = RobertaModel.from_pretrained(EMBEDD_MODEL_PATH).to(device)
embedd_model.eval()

# Load graph vulnerability classificastion model
graph_vul_model = GraphNN(mtype=["GCN"], infeats=768, hfeats=[2048, 2048],
                          fc1_layer=256, fc2_layer=64, n_gph=0, outclass=2,
                          gptype="max", ginfeat=1024, num_query_vectors=2)

graph_vul_model.load_state_dict(torch.load("src/model/best_model_GCN_2L_max.pt", map_location=device))
graph_vul_model = graph_vul_model.to(device)
graph_vul_model.eval()

# Load node vulnerability detection model
node_vul_model = NodeClassifierGNN(mtype=["GAT", ""], infeats=768, hfeats=[256, 128],
                                    fc1_layer=256, fc2_layer=64, outclass=2, ginfeat=1024)
node_vul_model.load_state_dict(torch.load("src/model/best_node_classifier_model.pt", map_location=device))
node_vul_model = node_vul_model.to(device)
node_vul_model.eval()

# Load vulnerability explaination model
llm = ChatOpenAI(
    model_name=MODEL_NAME,
    base_url=BASE_URL,
    api_key=GEMINI_API_KEY,
    temperature=0.5,
    max_retries=3,
    request_timeout=180
)


# Create the final configuration object to be passed to the graph
config = {
    "configurable": {
        "embedd_tokenizer": embedd_tokenizer,
        "embedd_model": embedd_model,
        "graph_vul_model": graph_vul_model,
        "node_vul_model": node_vul_model,
        "llm": llm,
    }
}

# Compile the graph
app_graph = build_graph()
logger.info("Models loaded and graph compiled. API is ready.")


# ==============================================================================
# 6. FASTAPI APPLICATION
# ==============================================================================


app = FastAPI(title="Smart Contract Vulnerability Scanner API", version="1.1.0")

# Add this middleware to your app
origins = [
    "http://localhost",
    "http://localhost:8080", # Add the origin of your frontend if it's served by a server
    "http://127.0.0.1",
    "http://127.0.0.1:5500", # Common port for VS Code Live Server
    "null"  # This is important if you are opening the HTML file directly in the browser (from file://)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, # Allows specific origins
    # or allow_origins=["*"] for allowing all, but be specific in production
    allow_credentials=True,
    allow_methods=["*"], # Allows all methods
    allow_headers=["*"], # Allows all headers
)

# Define a unique sentinel object to signal the end of the iterator
_SENTINEL = object()

# Helper function to be run in the thread. This prevents StopIteration
# from leaking into the async context.
def _get_next_or_sentinel(sync_iterator):
    """
    Calls next() on the iterator. If StopIteration is raised,
    returns the sentinel value instead.
    """
    try:
        return next(sync_iterator)
    except StopIteration:
        return _SENTINEL

# A helper to run the sync iterator in a thread, making it async
async def run_sync_iterator_in_thread(sync_iterator):
    """
    Wraps a synchronous iterator in an async generator, running the
    blocking `next()` calls in a separate thread using a sentinel
    to gracefully handle the end of the iterator.
    """
    while True:
        # Run our helper in a worker thread. It will return an item
        # or the sentinel when the iterator is exhausted.
        item = await to_thread.run_sync(_get_next_or_sentinel, sync_iterator)

        if item is _SENTINEL:
            # The iterator is exhausted, so we're done.
            # We break the loop and the async generator finishes gracefully.
            break
        else:
            # We have a valid item, yield it.
            yield item

@app.post("/analyze")
async def analyze_contract(file: UploadFile = File(...)):
    if not file.filename.endswith(".sol"):
        return {"error": "Invalid file type. Please upload a .sol file."}

    async def stream_generator():
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_file_path = os.path.join(temp_dir, file.filename)
            with open(temp_file_path, "wb") as buffer: buffer.write(await file.read())

            initial_state = {"sol_file_path": temp_file_path, "fcg_save_dir": temp_dir}
            
            # Use the robust async for loop with our helper
            async for event in run_sync_iterator_in_thread(app_graph.stream(initial_state, config)):
                node_name, node_output_state = list(event.items())[0]
                
                # Format a clean output for the client for this step
                output_data = {"node": node_name, "output": {}}
                if "error" in node_output_state:
                     output_data["output"]["error"] = node_output_state["error"]
                elif node_name == "convert_to_fcg":
                    output_data["output"] = {k: v for k, v in node_output_state.items() if k in ["fcg_file_path", "mapping_file_path"]}
                elif node_name == "detect_vulnerability_src":
                    output_data["output"] = {k: v for k, v in node_output_state.items() if k in ["predicted_class", "confidence_score"]}
                elif node_name == "detect_vulnerability_func":
                    output_data["output"] = {k: v for k, v in node_output_state.items() if k in ["func_vulnerability_predictions", "fcg_edges"]}
                elif node_name == "explain_vulnerability_func":
                     output_data["output"] = {"explanations": node_output_state.get("func_vulnerability_explanations")}
                
                yield json.dumps(output_data) + "\n"

    return StreamingResponse(stream_generator(), media_type="application/x-ndjson")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)