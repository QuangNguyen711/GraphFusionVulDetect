# File: nodes/graph_converter.py

from langchain_core.runnables import RunnableConfig
from src.graph.state import State
import os
import json
import traceback
from pathlib import Path
import networkx as nx
import dgl
import pandas as pd
import random
from .graph_converter import get_call_graph
from .embedding_generator import extract_function_code, get_embeddings

def convert_to_fcg(state: State, config: RunnableConfig) -> State:
    """NODE: Chuyển file smart contract định dạng .sol sang dạng file .fcg (Function Call Graph)."""
    """Process a Solidity file to generate a DGL graph with contract_index."""

    solFileSrc = state["sol_file_path"]
    fcgFileDst = state["fcg_save_dir"]
    
    try:
        fcgFileDst = Path(fcgFileDst)
        fcg_file = fcgFileDst / f'{Path(solFileSrc).stem}.fcg'
        print(f"Processing {solFileSrc}")
        # Generate call graph and code mappings
        G = get_call_graph(solFileSrc)
        G = nx.DiGraph(G)
        
        if len(G.nodes()) == 0:
            print(f"Compiler failed on: {solFileSrc}")
            return None
        
        # Compute graph metrics and contract indices
        mappings, mappingsH, contract_indices, mapping_code, node_mapping = {}, {}, {}, {}, {}
        katz = nx.katz_centrality(G)
        closeness = nx.closeness_centrality(G)
        clustering = nx.clustering(G)
        
        # Map contracts to indices
        contract_names = [data['contract_name'] for node, data in G.nodes(data=True)]
        unique_contracts = sorted(set(contract_names))
        contract_to_idx = {name: idx for idx, name in enumerate(unique_contracts)}
        
        for idx, (node, data) in enumerate(G.nodes(data=True)):
            # print(data)
            mappings[node] = [
                G.in_degree(node),
                G.out_degree(node),
                katz[node],
                closeness[node],
                clustering[node]
            ]
            code_start = data['node_source_code_start']
            code_length = data['node_source_code_length']
            function_name = data['label'].split(".sol_")[1]
            function_name = function_name.replace("_", ".") 
            function_code = extract_function_code(solFileSrc, code_start, code_length)
            mapping_code[function_name] = function_code
            node_mapping[function_name] = idx
            mappingsH[node] = get_embeddings(extract_function_code(solFileSrc, code_start, code_length))
            contract_indices[node] = contract_to_idx[data['contract_name']]
            
        # Set node attributes
        nx.set_node_attributes(G, mappings, 'features')
        nx.set_node_attributes(G, mappingsH, 'featuresH')
        nx.set_node_attributes(G, contract_indices, 'contract_index')
        
        # Convert to DGL graph
        cg = nx.convert_node_labels_to_integers(G)
        dg = dgl.from_networkx(cg, node_attrs=['features', 'featuresH', 'contract_index'])
        
        # Save DGL graph if it doesn't exist
        if not os.path.exists(fcg_file):
            dgl.data.utils.save_graphs(str(fcg_file), [dg])
            print(f"Saved FCG: {fcg_file}")

        # Save mappings to JSON
        mapping_node_code = {
            "node": node_mapping,
            "code": mapping_code
        }

        # print(mapping_node_code)
        json_path = fcgFileDst / f'{Path(solFileSrc).stem}_mapping.json'
        os.makedirs(fcgFileDst, exist_ok=True)
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(mapping_node_code, f, indent=4, ensure_ascii=False)
        print(f"Saved mapping: {json_path}")
        state["mapping_file_path"] = str(json_path)
        state["fcg_file_path"] = str(fcg_file)
    
    except Exception as e:
        print(f"Error processing {solFileSrc}: {str(e)}")
        traceback.print_exc()
        state["fcg_file_path"] = f"Error in processing file: {str(e)}"
        state["mapping_file_path"] = f"Error in processing file: {str(e)}"
    
    return state
        