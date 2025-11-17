from transformers import RobertaTokenizer, RobertaModel
import torch
import logging
from src.utils.helper import seed_everything, prepare_solc_artifacts
from src.model.GraphClasifier import GraphNN
from src.model.NodeDetector import NodeClassifierGNN
from src.graph.builder import build_graph

logger = logging.getLogger("Slither-simil")

seed_everything(42)

prepare_solc_artifacts()

# Load the embedding tokenizer and model
embedd_tokenizer = RobertaTokenizer.from_pretrained("Quangnguyen711/codebert-syntax-solidity-time-dep")
embedd_model = RobertaModel.from_pretrained("Quangnguyen711/codebert-syntax-solidity-time-dep")
embedd_model.eval()

# Load graph vulnerability classificastion model
graph_vul_model = GraphNN(mtype=["GCN"], infeats=768, hfeats=[2048, 2048],
                          fc1_layer=256, fc2_layer=64, n_gph=2, outclass=2,
                          gptype="max", ginfeat=1024, num_query_vectors=2)

graph_vul_model.load_state_dict(torch.load("src/model/best_model_GCN_2L_max.pt", map_location=torch.device('cpu')))
graph_vul_model.eval()

# Load node vulnerability detection model
node_vul_model = NodeClassifierGNN(mtype=["GCN", ""], infeats=768, hfeats=[2048, 2048],
                                    fc1_layer=256, fc2_layer=64, outclass=2, ginfeat=1024)
node_vul_model.load_state_dict(torch.load("src/model/best_node_classifier_model.pt", map_location=torch.device('cpu')))
node_vul_model.eval()

# Load vulnerability explaination model


config = {
    "configurable": {
        "embedd_tokenizer": embedd_tokenizer,
        "embedd_model": embedd_model,
        "graph_vul_model": graph_vul_model,
    }
}

graph = build_graph()

if __name__ == "__main__":
    print("Configuration loaded successfully.")
    sol_file_path = "datasets/SmartContractVulnerabilityDetection/SourceCodeSyntaxDataset/TimestampDependencyDataset/Test/Vulnerable/0x0a7d11ea2308f80eb239f2e4c77715725ae8650d.sol"
    fcg_save_dir = "output"
    print(f"Solidity file path: {sol_file_path}")

    state = {
        "sol_file_path": sol_file_path,
        "fcg_save_dir": fcg_save_dir
    }

    result_state = graph.invoke(state, config)
    print("Predicted class:", result_state.get("predicted_class"))
    print("Confidence score:", result_state.get("confidence_score"))
    print("Function-level vulnerability predictions:")
    for func_result in result_state.get("function_vul_results", []):
        print(func_result)