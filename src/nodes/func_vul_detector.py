from langchain_core.runnables import RunnableConfig
from src.graph.state import State
import dgl
import torch
import torch.nn.functional as F
import json
import os

def detect_vulnerability_func(state: State, config: RunnableConfig) -> State:
    """
    Loads a trained GNN model and predicts vulnerabilities for nodes in a single graph.

    Args:
        model_path (str): Path to the saved model file (.pth).
        graph_path (str): Path to the graph file to be analyzed (.fcg).
        model_params (dict): A dictionary containing the model's architecture parameters.
    
    Returns:
        list: A list of dictionaries, where each dictionary contains the function name,
              predicted label, and confidence score.
    """

    
    model = config["configurable"]["node_vul_model"]
    graph_path = state["fcg_file_path"]
    
    # --- Step 3: Load and preprocess the input graph ---
    print(f"Loading and preprocessing graph from {graph_path}...")
    graph = dgl.load_graphs(graph_path)[0][0]
    graph = dgl.add_self_loop(graph) # Apply the same preprocessing as in training
    
    # --- Step 4: Perform prediction ---
    features = graph.ndata['featuresH'].float()
    
    with torch.no_grad(): # Disable gradient calculation for inference
        logits = model(graph, features)
        
        # --- Step 5: Post-process the output ---
        probabilities = F.softmax(logits, dim=1)
        predictions = torch.argmax(probabilities, dim=1)
        
    # --- Step 6: Map results to function names for readability ---
    mapping_path = graph_path.replace(".fcg", "_mapping.json")
    results = []
    
    if os.path.exists(mapping_path):
        with open(mapping_path, 'r') as f:
            mapping_data = json.load(f)
        
        # `mapping_data['node_to_name']` should map node index (as string) to function name
        node_to_name = mapping_data.get('node_to_name', {})
        
        for i, (pred, prob) in enumerate(zip(predictions, probabilities)):
            node_name = node_to_name.get(str(i), f"Node_{i}") # Fallback name
            confidence = prob[pred].item()
            results.append({
                "function_name": node_name,
                "prediction": pred.item(), # 0 for non-vulnerable, 1 for vulnerable
                "confidence": f"{confidence:.2%}"
            })
    else:
        print(f"Warning: Mapping file not found at {mapping_path}. Returning raw predictions.")
        return (predictions.cpu().numpy(), probabilities.cpu().numpy())
        
    state["func_vulnerability_predictions"] = results
    return state