from .utils.helper import seed_everything, prepare_solc_artifacts
from .graph.builder import build_graph
from src.infrastructure.analysis_model.GraphClasifier import GraphNN
from src.infrastructure.analysis_model.NodeDetector import NodeClassifierGNN
from src.config.settings import settings
import torch

class GFDWorkflow:
    def __init__(self):
        self.device = torch.device(settings.DEVICE)
        self.embedd_tokenizer = None
        self.embedd_model = None
        self.graph_vul_model = None
        self.node_vul_model = None
        self.llm = None

    def initialize(self):
        """Called ONCE during app startup."""
        seed_everything(settings.SEED)
        prepare_solc_artifacts()

        self._load_embedding_model()
        self._load_graph_model()
        self._load_node_model()
        self._load_llm()

    def _load_embedding_model(self):
        from transformers import RobertaTokenizer, RobertaModel

        emb_path = settings.EMBEDDING_MODEL_PATH
        self.embedd_tokenizer = RobertaTokenizer.from_pretrained(emb_path)
        self.embedd_model = RobertaModel.from_pretrained(emb_path).to(self.device).eval()

    def _load_graph_model(self):
        model = GraphNN(
            mtype=["GCN"], infeats=768,
            hfeats=[2048, 2048],
            fc1_layer=256, fc2_layer=64,
            n_gph=0, outclass=2,
            gptype="max", ginfeat=1024,
            num_query_vectors=2,
        )
        model.load_state_dict(torch.load(settings.GRAPH_VUL_MODEL_PATH, map_location=self.device))
        self.graph_vul_model = model.to(self.device).eval()

    def _load_node_model(self):
        model = NodeClassifierGNN(
            mtype=["GAT", ""],
            infeats=768, hfeats=[256, 128],
            fc1_layer=256, fc2_layer=64,
            outclass=2, ginfeat=1024
        )
        model.load_state_dict(torch.load(settings.NODE_VUL_MODEL_PATH, map_location=self.device))
        self.node_vul_model = model.to(self.device).eval()

    def _load_llm(self):
        from langchain_openai import ChatOpenAI

        self.llm = ChatOpenAI(
            model_name=settings.MODEL_NAME,
            api_key=settings.GEMINI_API_KEY1,
            base_url=settings.BASE_URL,
            temperature=settings.CHATBOT_TEMPERATURE,
            max_tokens=settings.CHATBOT_MAX_TOKENS,
            max_retries=3,
            request_timeout=50
        )

    def build_pipeline(self):
        """Build graph AFTER loading all models."""
        return build_graph()


# Singleton workflow instance
gfd_workflow = GFDWorkflow()
