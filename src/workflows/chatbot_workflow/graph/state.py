from typing import TypedDict, Optional, List, Dict, Any


class State(TypedDict):
    """State for the chatbot refactoring workflow."""
    # Input
    code: str
    issue_description: str
    conversation_history: Optional[List[Dict[str, str]]]
    
    # Processing
    analysis_result: Optional[Dict[str, Any]]
    refactoring_suggestions: Optional[List[Dict[str, Any]]]
    
    # Output
    bot_message: Optional[str]
    suggested_code: Optional[str]
    explanation: Optional[str]
    validation_result: Optional[Dict[str, Any]]
