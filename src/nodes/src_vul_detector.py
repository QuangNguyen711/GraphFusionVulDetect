from langchain_core.runnables import RunnableConfig
from src.graph.state import State
import dgl
import torch
import torch.nn.functional as F

def detect_vulnerability_src(state: State, config: RunnableConfig) -> State:
    """
    Performs inference on a single smart contract graph.

    model: The trained and loaded GraphNN model.
    fcg_path: Path to the .fcg file of the smart contract.
    class_map: A dictionary mapping class indices to names (e.g., {0: "Non-Vulnerable", 1: "Vulnerable"}).
    
    return: A tuple of (predicted_class_name, confidence_score)
    """

    model = config["configurable"]["graph_vul_model"]
    fcg_path = state["fcg_file_path"]
    class_map = {0: "Non-Vulnerable", 1: "Vulnerable"}
    
    # Ensure gradients are not calculated
    with torch.no_grad():
        # 1. Load the graph using our new inference loader
        graph = dgl.load_graphs(fcg_path)[0][0]
        graph.ndata["features"] = graph.ndata["featuresH"]
        
        # 2. Perform the same preprocessing as in training (add self-loop)
        graph = dgl.add_self_loop(graph)
        
        # 3. Create a batch containing only our single graph
        batched_graph = dgl.batch([graph]).to(model.device)
        
        # 4. Get the node features
        features = batched_graph.ndata['features']
        
        # 5. Get model predictions (logits)
        logits = model(batched_graph, features)
        
        # 6. Convert logits to probabilities
        probabilities = F.softmax(logits, dim=1)
        
        # 7. Get the predicted class index and the corresponding confidence
        confidence, predicted_idx_tensor = torch.max(probabilities, 1)
        predicted_idx = predicted_idx_tensor.item()
        
        # 8. Map index to class name
        predicted_class_name = class_map[predicted_idx]
    
    state["predicted_class"] = predicted_class_name
    state["confidence_score"] = confidence.item()
    return state