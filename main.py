# File: main.py

import logging
from src.workflows.gfd_workflow.workflow import gfd_workflow
import json

logger = logging.getLogger("Slither-simil")

gfd_workflow.initialize()

config = {
    "configurable": {
        "embedd_tokenizer": gfd_workflow.embedd_tokenizer,
        "embedd_model": gfd_workflow.embedd_model,
        "graph_vul_model": gfd_workflow.graph_vul_model,
        "node_vul_model": gfd_workflow.node_vul_model,
        "llm": gfd_workflow.llm,
    }
}

graph = gfd_workflow.build_pipeline()

if __name__ == "__main__":
    print("Configuration loaded successfully.")
    sol_file_path = "assets/datasets/SourceCodeSyntaxDataset/TimestampDependencyDataset/Test/Vulnerable/0x39aa4006ee5941c0c0e41b924fdafcb2c4c918e8.sol"
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