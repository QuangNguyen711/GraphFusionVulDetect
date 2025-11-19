# File: src/nodes/func_vul_detector.py

import json
import os

import dgl
import torch
import torch.nn.functional as F
from langchain_core.runnables import RunnableConfig

from src.graph.state import State


def detect_vulnerability_func(state: State, config: RunnableConfig) -> State:
    """
    Performs node-level (function-level) vulnerability prediction on a graph.

    This node loads a DGL graph and a trained node classification GNN model.
    It runs inference on every node in the graph to predict if the corresponding
    function is vulnerable. The results are then mapped back to their original
    function names and source code using an associated mapping JSON file.
    Only the functions predicted as vulnerable (class index 1) are stored in the
    final output list.

    Args:
        state (State): The current state, which must contain `fcg_file_path`.
                       The results will be stored in `func_vulnerability_predictions`.
        config (RunnableConfig): The configuration object, providing access to the
                                 trained node classification model via `node_vul_model`.

    Returns:
        State: The updated state object containing a list of dictionaries,
               where each dictionary represents a function predicted as vulnerable.
    """
    model = config["configurable"]["node_vul_model"]
    graph_path = state["fcg_file_path"]

    print(f"Loading and preprocessing graph from {graph_path}...")
    graph = dgl.load_graphs(graph_path)[0][0]
    graph = dgl.add_self_loop(graph).to(model.device)

    # Extract features and set the model to evaluation mode
    features = graph.ndata['featuresH'].float().to(model.device)
    model.eval()

    # Perform inference without calculating gradients
    with torch.no_grad():
        logits = model(graph, features)
        probabilities = F.softmax(logits, dim=1)
        predictions = torch.argmax(probabilities, dim=1)

    print("Raw predictions per node:", predictions)

    # Map the numerical predictions back to human-readable function names
    mapping_path = graph_path.replace(".fcg", "_mapping.json")
    results = []

    if os.path.exists(mapping_path):
        with open(mapping_path, 'r', encoding='utf-8') as f:
            mapping_data = json.load(f)

        # Invert the name-to-index mapping to get an index-to-name mapping
        name_to_index_map = mapping_data.get('node', {})
        index_to_name_map = {v: k for k, v in name_to_index_map.items()}

        for i, (pred, prob) in enumerate(zip(predictions, probabilities)):
            # Look up the function name using its integer index
            node_name = index_to_name_map.get(i, f"Node_{i}") # Use a fallback name if not found
            confidence = prob[pred].item()

            results.append({
                "function_name": node_name,
                "function_code": mapping_data.get("code", {}).get(node_name, ""),
                "prediction": pred.item(),
                "confidence": f"{confidence:.2%}"
            })
            
            # print(f"Function: {node_name}, Prediction: {pred.item()}, Confidence: {confidence:.2%}")
    else:
        print(f"Warning: Mapping file not found at {mapping_path}. Cannot map results to names.")
        # Create a basic result list even if mapping is missing
        for i, (pred, prob) in enumerate(zip(predictions, probabilities)):
            confidence = prob[pred].item()
            results.append({
                "function_name": f"Node_{i}",
                "function_code": "",
                "prediction": pred.item(),
                "confidence": f"{confidence:.2%}"
            })

    state["func_vulnerability_predictions"] = results
    return state