"""
Validate refactoring node for the chatbot workflow.
"""

import logging
from langchain_core.runnables import RunnableConfig
from src.workflows.chatbot_workflow.graph.state import State


logger = logging.getLogger(__name__)


def validate_refactoring(state: State, config: RunnableConfig) -> State:
    """
    Validate the suggested refactoring against best practices.
    
    Args:
        state: Current workflow state
        config: Runnable configuration
        
    Returns:
        Updated state with validation results
    """
    # Handle None values by converting to empty string
    suggested_code = state.get("suggested_code") or ""
    original_code = state.get("code") or ""
    
    print(f"Validating refactoring (suggested_code length: {len(suggested_code)}, original length: {len(original_code)})")
    
    validation_result = {
        "is_valid": True,
        "warnings": [],
        "suggestions": []
    }
    
    # Basic validation checks
    if not suggested_code.strip():
        validation_result["is_valid"] = False
        validation_result["warnings"].append("No suggested code provided")
        print("Validation failed: No suggested code provided")
    elif suggested_code == original_code:
        validation_result["warnings"].append("Suggested code is identical to original")
        print("Validation warning: Suggested code identical to original")
    
    # Check for common Solidity patterns
    if suggested_code:
        if "pragma solidity" not in suggested_code and "pragma solidity" in original_code:
            validation_result["warnings"].append("Pragma statement missing in suggested code")
        
        # Check for basic structure
        if "function" in original_code and "function" not in suggested_code:
            validation_result["warnings"].append("Function declaration might be missing")
    
    state["validation_result"] = validation_result
    
    if validation_result["warnings"]:
        print(f"Validation warnings: {validation_result['warnings']}")
    else:
        print("Validation passed successfully")
    
    return state
