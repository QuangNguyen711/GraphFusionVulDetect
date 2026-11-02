# File: src/nodes/src_vul_detector.py

import dgl
import torch
import torch.nn.functional as F
from langchain_core.runnables import RunnableConfig

from src.workflows.gfd_workflow.graph.state import State


def detect_vulnerability_src(state: State, config: RunnableConfig) -> State:
    """
    Performs vulnerability detection on a smart contract's Function Call Graph (FCG).

    This node loads a pre-processed DGL graph from the path specified in the
    state, prepares it for inference by adding self-loops and batching, and
    then passes it through a trained Graph Neural Network model to predict
    whether the contract is vulnerable. The final prediction and confidence
    score are added back into the state object.

    Args:
        state (State): The current state, which must contain the `fcg_file_path`.
                       The result will be added to this state object.
        config (RunnableConfig): The configuration object, which provides access
                                 to the loaded GNN model via `graph_vul_model`.

    Returns:
        State: The updated state object containing the `predicted_class`
               (e.g., "Vulnerable") and the `confidence_score`.
    """
    model = config["configurable"]["graph_vul_model"]
    fcg_path = state["fcg_file_path"]
    class_map = {0: "Non-Vulnerable", 1: "Vulnerable"}

    # Perform inference without calculating gradients to save memory and computation
    with torch.no_grad():
        # Load the graph from the specified file path
        graph = dgl.load_graphs(fcg_path)[0][0]
        
        # Use the code embeddings ('featuresH') as the primary node features
        graph.ndata["features"] = graph.ndata["featuresH"]
        
        # Add self-loops to the graph, a common practice for GNNs
        graph = dgl.add_self_loop(graph)
        
        # Create a batch containing the single graph and move it to the GPU
        batched_graph = dgl.batch([graph]).to(model.device)
        
        # Extract node features and move them to the GPU
        features = graph.ndata['features'].to(model.device)
        
        # Get the raw model output (logits)
        logits = model(batched_graph, features)
        
        # Convert logits to a probability distribution using softmax
        probabilities = F.softmax(logits, dim=1)
        
        # Find the class with the highest probability
        confidence, predicted_idx_tensor = torch.max(probabilities, 1)
        predicted_idx = predicted_idx_tensor.item()
        
        # Map the predicted index to its corresponding class name
        predicted_class_name = class_map[predicted_idx]
    
    state["predicted_class"] = predicted_class_name
    state["confidence_score"] = confidence.item()
    
    return state