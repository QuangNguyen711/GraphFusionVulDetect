from src.workflows.gfd_workflow.workflow import gfd_workflow

graph_instance = None
config = {
        "configurable": {
            "embedd_tokenizer": None,
            "embedd_model": None,
            "graph_vul_model": None,
            "node_vul_model": None,
            "llm": None,
        }
    }

def build_global_graph():
    global graph_instance, config
    graph_instance = gfd_workflow.build_pipeline()
    config["configurable"]["embedd_tokenizer"] = gfd_workflow.embedd_tokenizer
    config["configurable"]["embedd_model"] = gfd_workflow.embedd_model
    config["configurable"]["graph_vul_model"] = gfd_workflow.graph_vul_model
    config["configurable"]["node_vul_model"] = gfd_workflow.node_vul_model
    config["configurable"]["llm"] = gfd_workflow.llm


def get_app_graph():
    return graph_instance

def get_models_config():
    return config