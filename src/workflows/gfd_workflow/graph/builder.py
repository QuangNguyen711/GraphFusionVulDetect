from __future__ import nested_scopes
from langgraph.graph import END, StateGraph, START
from src.workflows.gfd_workflow.graph.state import State
from src.workflows.gfd_workflow.nodes.fcg_converter.fcg_converter import convert_to_fcg
from src.workflows.gfd_workflow.nodes.func_vul_detector import detect_vulnerability_func
from src.workflows.gfd_workflow.nodes.src_vul_detector import detect_vulnerability_src
from src.workflows.gfd_workflow.nodes.func_vul_explainer import explain_vulnerability_func

def src_is_vulnerable(state: State) -> str:
    """Conditional function to check if the source code vulnerability detection predicted 'Vulnerable'."""
    return state.get("predicted_class", "")

def build_graph() -> StateGraph:
    # Define the graph
    graph_builder = StateGraph(State)
    # Set the recursion limit
    # graph_builder.set_config({'recursion_limit': 50})
    
    # Add nodes
    graph_builder.add_node("convert_to_fcg", convert_to_fcg)
    graph_builder.add_node("detect_vulnerability_src", detect_vulnerability_src)
    graph_builder.add_node("detect_vulnerability_func", detect_vulnerability_func)
    graph_builder.add_node("explain_vulnerability_func", explain_vulnerability_func)

    graph_builder.add_edge(START, "convert_to_fcg")
    graph_builder.add_edge("convert_to_fcg", "detect_vulnerability_src")
    graph_builder.add_conditional_edges(
        "detect_vulnerability_src", 
        src_is_vulnerable,
        {
            "Non-Vulnerable": END,
            "Vulnerable": "detect_vulnerability_func"
        }
    )
    
    graph_builder.add_edge("detect_vulnerability_func", 'explain_vulnerability_func')
    graph_builder.add_edge("explain_vulnerability_func", END)

    return graph_builder.compile()
