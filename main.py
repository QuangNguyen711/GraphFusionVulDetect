# File: main.py

from transformers import RobertaTokenizer, RobertaModel
import torch
import logging
from src.utils.helper import seed_everything, prepare_solc_artifacts
from src.model.GraphClasifier import GraphNN
from src.model.NodeDetector import NodeClassifierGNN
from src.graph.builder import build_graph
from langchain_openai import ChatOpenAI
import os
import json
import dotenv

dotenv.load_dotenv()

logger = logging.getLogger("Slither-simil")
device = torch.device("cuda:1" if torch.cuda.is_available() else "cpu")

seed_everything(42)
prepare_solc_artifacts()

EMBEDD_MODEL_PATH = os.getenv("EMBEDDING_MODEL_PATH")
GRAPH_VUL_MODEL_PATH = os.getenv("GRAPH_VUL_MODEL_PATH")
NODE_VUL_MODEL_PATH = os.getenv("NODE_VUL_MODEL_PATH")

MODEL_NAME = os.getenv("MODEL_NAME")
BASE_URL = os.getenv("BASE_URL")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Load the embedding tokenizer and model
embedd_tokenizer = RobertaTokenizer.from_pretrained()
embedd_model = RobertaModel.from_pretrained().to(device)
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

config = {
    "configurable": {
        "embedd_tokenizer": embedd_tokenizer,
        "embedd_model": embedd_model,
        "graph_vul_model": graph_vul_model,
        "node_vul_model": node_vul_model,
        "llm": llm,
    }
}

graph = build_graph()

if __name__ == "__main__":
    print("Configuration loaded successfully.")
    sol_file_path = "datasets/SmartContractVulnerabilityDetection/SourceCodeSyntaxDataset/TimestampDependencyDataset/Test/Vulnerable/0x39aa4006ee5941c0c0e41b924fdafcb2c4c918e8.sol"
    fcg_save_dir = "output"
    print(f"Solidity file path: {sol_file_path}")

    state = {
        "sol_file_path": sol_file_path,
        "fcg_save_dir": fcg_save_dir
    }

    result_state = graph.invoke(state, config)
    print("Predicted class:", result_state.get("predicted_class"))
    print("Confidence score:", result_state.get("confidence_score"))
    print("Function-level vulnerability explainations:")
    for func_result in result_state.get("func_vulnerability_explanations", []):
        print(json.dumps(func_result, indent=2))