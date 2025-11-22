import os
import logging
import torch
import dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from transformers import RobertaTokenizer, RobertaModel
from langchain_openai import ChatOpenAI
from src.utils.helper import seed_everything, prepare_solc_artifacts
from src.model.GraphClasifier import GraphNN
from src.model.NodeDetector import NodeClassifierGNN
from src.graph.builder import build_graph
from .router import create_router
from .database import db_manager

# Load environment variables
dotenv.load_dotenv()

# Suppress Slither's verbose output
os.environ['SLITHER_LOG_LEVEL'] = 'CRITICAL'

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("GraphFusionVulDetect-API")

# Use CUDA if available, otherwise CPU
# device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
device = torch.device("cpu")
logger.info(f"Using device: {device}")

# Initialize global variables for models and config
embedd_tokenizer = None
embedd_model = None
graph_vul_model = None
node_vul_model = None
llm = None
app_graph = None
config = None

def load_models():
    """Load all models and configurations"""
    global embedd_tokenizer, embedd_model, graph_vul_model, node_vul_model, llm, app_graph, config
    
    logger.info("Loading models...")
    
    # Set seed and prepare artifacts
    seed_everything(42)
    prepare_solc_artifacts()
    
    # Get model paths from environment
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
    
    # Load graph vulnerability classification model
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
    
    # Load vulnerability explanation model
    llm = ChatOpenAI(
        model_name=MODEL_NAME,
        base_url=BASE_URL,
        api_key=GEMINI_API_KEY,
        temperature=0.5,
        max_retries=3,
        request_timeout=180
    )
    
    # Create the final configuration object
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

def create_app():
    """Create and configure the FastAPI application"""
    app = FastAPI(
        title="Smart Contract Vulnerability Scanner API",
        version="1.1.0",
        description="API for Smart Contract Vulnerability Detection using Graph Neural Networks and LLM",
        docs_url="/docs",
        redoc_url="/redoc"
    )
    
    # Add CORS middleware
    origins = [
        "http://localhost",
        "http://localhost:8080",
        "http://localhost:3000",
        "http://127.0.0.1",
        "http://127.0.0.1:5500",
        "http://127.0.0.1:8080",
        "http://127.0.0.1:3000",
        "null"
    ]
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Load models on startup
    async def startup():
        # Connect to database
        await db_manager.connect()
        # Load models
        load_models()
    
    async def shutdown():
        # Disconnect from database
        await db_manager.disconnect()
    
    app.add_event_handler("startup", startup)
    app.add_event_handler("shutdown", shutdown)
    
    # Include routers
    app.include_router(create_router())
    
    @app.get("/")
    async def root():
        return {
            "message": "Smart Contract Vulnerability Scanner API",
            "version": "1.1.0",
            "status": "running"
        }
    
    @app.get("/health")
    async def health_check():
        return {
            "status": "healthy",
            "models_loaded": config is not None,
            "device": str(device)
        }
    
    return app

# Getter functions for models and config (to be used in routes)
def get_models_config():
    """Get the loaded models configuration"""
    return config

def get_app_graph():
    """Get the compiled app graph"""
    return app_graph

# Create app instance
app = create_app()