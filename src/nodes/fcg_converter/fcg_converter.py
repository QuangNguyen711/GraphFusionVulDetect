# File: nodes/fcg_converter/fcg_converter.py

import json
import os
import traceback
from pathlib import Path

import dgl
import networkx as nx
from langchain_core.runnables import RunnableConfig

from src.graph.state import State
from .embedding_generator import extract_function_code, get_embeddings
from .graph_converter import get_call_graph


def convert_to_fcg(state: State, config: RunnableConfig) -> State:
    """
    Converts a Solidity source file into a Function Call Graph (FCG).

    This node performs several key steps:
    1.  Generates a raw FCG from the .sol file using Slither.
    2.  Creates a stable, deterministic mapping from function names to integer IDs
        by sorting the node names alphabetically.
    3.  Extracts graph-based features (e.g., degree, centrality) for each node.
    4.  Generates code embeddings for each function's source code.
    5.  Saves the final graph as a DGL graph object (.fcg) and the stable node
        mapping and source code snippets to a corresponding .json file.
    6.  Saves the list of graph edges (using stable integer IDs) to the state.

    Args:
        state (State): The current state object containing the path to the
                       input Solidity file (`sol_file_path`) and the
                       directory to save the output (`fcg_save_dir`).
        config (RunnableConfig): The configuration object, which provides access
                                 to the embedding model and tokenizer.

    Returns:
        State: The updated state object with paths to the newly created
               .fcg file, mapping .json file, and a list of graph edges.
               In case of an error, these fields will contain error messages
               or be empty.
    """
    try:
        tokenizer = config["configurable"]["embedd_tokenizer"]
        model = config["configurable"]["embedd_model"]
        sol_file_src = state["sol_file_path"]
        fcg_save_dir = Path(state["fcg_save_dir"])

        print(f"Processing {sol_file_src}")
        fcg_file_path = fcg_save_dir / f'{Path(sol_file_src).stem}.fcg'

        # Generate the initial graph from the source file
        graph = get_call_graph(sol_file_src)
        print(f"--- INFO: Graph from Slither has {len(graph.nodes())} nodes. ---")
        
        if not graph or len(graph.nodes()) == 0:
            print(f"Compiler failed or produced an empty graph for: {sol_file_src}")
            state["fcg_file_path"] = f"Error: No graph generated for {sol_file_src}"
            state["mapping_file_path"] = f"Error: No graph generated for {sol_file_src}"
            state["fcg_edges"] = []  # Set edges to empty list on failure
            return state

        # Ensure the graph is a standard DiGraph
        graph = nx.DiGraph(graph)

        # Create a stable, deterministic mapping from node names to integer indices.
        # Sorting alphabetically guarantees the order is the same every time.
        sorted_node_names = sorted(list(graph.nodes()))
        stable_name_to_idx_map = {node_name: i for i, node_name in enumerate(sorted_node_names)}

        # --- Feature and Embedding Extraction ---
        features, embeddings, contract_indices = {}, {}, {}
        function_codes, final_json_node_mapping = {}, {}

        # Pre-calculate graph-wide metrics
        katz_centrality = nx.katz_centrality(graph)
        closeness_centrality = nx.closeness_centrality(graph)
        clustering_coeffs = nx.clustering(graph)

        # Create a mapping for contract names to indices
        contract_names = {data['contract_name'] for _, data in graph.nodes(data=True)}
        contract_to_idx = {name: idx for idx, name in enumerate(sorted(list(contract_names)))}

        # Iterate using the guaranteed sorted order for deterministic feature assignment
        for node_name in sorted_node_names:
            data = graph.nodes[node_name]
            stable_idx = stable_name_to_idx_map[node_name]

            # Basic graph features
            features[node_name] = [
                graph.in_degree(node_name),
                graph.out_degree(node_name),
                katz_centrality[node_name],
                closeness_centrality[node_name],
                clustering_coeffs[node_name],
            ]
            
            # Extract source code and generate embeddings
            function_code = extract_function_code(
                sol_file_src, data['node_source_code_start'], data['node_source_code_length']
            )
            embeddings[node_name] = get_embeddings(tokenizer, model, function_code)
            
            # Store contract index
            contract_indices[node_name] = contract_to_idx.get(data['contract_name'], -1)
            
            # Prepare data for the final JSON mapping file
            pretty_function_name = data['label'].split(".sol_")[1].replace("_", ".")
            function_codes[pretty_function_name] = function_code
            final_json_node_mapping[pretty_function_name] = stable_idx
            
        # Set the extracted data as node attributes in the NetworkX graph
        nx.set_node_attributes(graph, features, 'features')
        nx.set_node_attributes(graph, embeddings, 'featuresH')
        nx.set_node_attributes(graph, contract_indices, 'contract_index')
        
        # Relabel the graph nodes to stable integer IDs for DGL conversion
        relabeled_graph = nx.relabel_nodes(graph, stable_name_to_idx_map)
        
        # Extract edges with the new stable integer IDs
        edges_with_stable_ids = list(relabeled_graph.edges())
        
        # Convert to DGL graph, preserving node attributes
        dgl_graph = dgl.from_networkx(relabeled_graph, node_attrs=['features', 'featuresH', 'contract_index'])
        
        # Save the DGL graph
        os.makedirs(fcg_save_dir, exist_ok=True)
        dgl.data.utils.save_graphs(str(fcg_file_path), [dgl_graph])
        print(f"Saved FCG: {fcg_file_path}")

        # Save the stable mapping and code snippets to a JSON file
        mapping_data = {"node": final_json_node_mapping, "code": function_codes}
        json_path = fcg_save_dir / f'{Path(sol_file_src).stem}_mapping.json'
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(mapping_data, f, indent=4, ensure_ascii=False)
        print(f"Saved mapping: {json_path}")
        
        # Update state with the paths to the created files and the extracted edges
        state["mapping_file_path"] = str(json_path)
        state["fcg_file_path"] = str(fcg_file_path)
        state["fcg_edges"] = edges_with_stable_ids
    
    except Exception as e:
        print(f"Error processing {sol_file_src}: {e}")
        traceback.print_exc()
        state["fcg_file_path"] = f"Error in processing file: {e}"
        state["mapping_file_path"] = f"Error in processing file: {e}"
        state["fcg_edges"] = [] # Set edges to empty list on error
    
    return state