from langgraph.graph import END, StateGraph, START
from src.workflows.chatbot_workflow.graph.state import State
from src.workflows.chatbot_workflow.nodes.analyze_code import analyze_code
from src.workflows.chatbot_workflow.nodes.generate_suggestions import generate_refactoring_suggestions
from src.workflows.chatbot_workflow.nodes.handle_conversation import handle_conversation
from src.workflows.chatbot_workflow.nodes.validate_refactoring import validate_refactoring


def should_continue_conversation(state: State) -> str:
    """
    Determine if we should continue the conversation or end.
    
    Args:
        state: Current workflow state
        
    Returns:
        "continue" if conversation should continue, "end" otherwise
    """
    # If there's a conversation history with recent user input
    if state.get("conversation_history"):
        last_message = state["conversation_history"][-1]
        # Check if user is asking for more help or has questions
        if last_message.get("role") == "user":
            content = last_message.get("content", "").lower()
            if any(word in content for word in ["thanks", "done", "that's all", "finish", "complete"]):
                return "end"
            return "continue"
    return "end"


def has_issue_description(state: State) -> str:
    """
    Check if we have an issue description to work with.
    
    Args:
        state: Current workflow state
        
    Returns:
        "yes" if issue description exists, "no" otherwise
    """
    if state.get("issue_description"):
        return "yes"
    return "no"


def build_graph() -> StateGraph:
    """
    Build the chatbot refactoring workflow graph.
    
    Returns:
        Compiled StateGraph for the chatbot workflow
    """
    graph_builder = StateGraph(State)
    
    # Add nodes
    graph_builder.add_node("analyze_code", analyze_code)
    graph_builder.add_node("generate_suggestions", generate_refactoring_suggestions)
    graph_builder.add_node("handle_conversation", handle_conversation)
    graph_builder.add_node("validate_refactoring", validate_refactoring)
    
    # Define edges
    graph_builder.add_edge(START, "analyze_code")
    
    # After analysis, check if we have an issue description
    graph_builder.add_conditional_edges(
        "analyze_code",
        has_issue_description,
        {
            "yes": "generate_suggestions",
            "no": END
        }
    )
    
    # After generating suggestions, go to validation
    graph_builder.add_edge("generate_suggestions", "validate_refactoring")
    
    # After validation, check if we should continue conversation
    graph_builder.add_conditional_edges(
        "validate_refactoring",
        should_continue_conversation,
        {
            "continue": "handle_conversation",
            "end": END
        }
    )
    
    # After handling conversation, loop back to validation or end
    graph_builder.add_conditional_edges(
        "handle_conversation",
        should_continue_conversation,
        {
            "continue": "handle_conversation",
            "end": END
        }
    )
    
    return graph_builder.compile()
