"""
Helper utilities for the chatbot refactoring workflow.
"""

import re
from typing import List, Dict, Any


def clean_llm_response(response: str) -> str:
    """
    Clean up LLM response by removing thinking tags and extra whitespace.
    
    Args:
        response: Raw LLM response
        
    Returns:
        Cleaned response text
    """
    # Remove thinking tags if present
    if "</think>" in response:
        response = response.split("</think>")[1].strip()
    
    # Remove excessive whitespace
    response = re.sub(r'\n\s*\n\s*\n', '\n\n', response)
    
    return response.strip()


def extract_code_blocks(text: str, language: str = "solidity") -> List[str]:
    """
    Extract code blocks from markdown-formatted text.
    
    Args:
        text: Text containing code blocks
        language: Expected language of code blocks
        
    Returns:
        List of extracted code blocks
    """
    # Pattern for language-specific code blocks
    pattern = rf'```{language}\n(.*?)```'
    blocks = re.findall(pattern, text, re.DOTALL)
    
    # Also try generic code blocks
    if not blocks:
        pattern = r'```\n(.*?)```'
        blocks = re.findall(pattern, text, re.DOTALL)
    
    return [block.strip() for block in blocks]


def extract_function_from_code(code: str, function_name: str) -> str:
    """
    Extract a specific function from Solidity code.
    
    Args:
        code: Full Solidity code
        function_name: Name of function to extract
        
    Returns:
        The extracted function code or empty string if not found
    """
    # Simple pattern to match function declarations
    pattern = rf'function\s+{function_name}\s*\([^)]*\)[^{{]*\{{[^}}]*\}}'
    match = re.search(pattern, code, re.DOTALL)
    
    if match:
        return match.group(0)
    
    return ""


def format_vulnerability_name(vuln_type: str) -> str:
    """
    Format vulnerability type name for display.
    
    Args:
        vuln_type: Raw vulnerability type string
        
    Returns:
        Formatted name
    """
    # Convert snake_case or camelCase to Title Case
    vuln_type = re.sub(r'[_-]', ' ', vuln_type)
    vuln_type = re.sub(r'([a-z])([A-Z])', r'\1 \2', vuln_type)
    return vuln_type.title()


def truncate_code_snippet(code: str, max_lines: int = 20) -> str:
    """
    Truncate code snippet to a maximum number of lines.
    
    Args:
        code: Code to truncate
        max_lines: Maximum number of lines to keep
        
    Returns:
        Truncated code with ellipsis if needed
    """
    lines = code.split('\n')
    
    if len(lines) <= max_lines:
        return code
    
    truncated_lines = lines[:max_lines]
    truncated_lines.append('// ... (code truncated)')
    
    return '\n'.join(truncated_lines)


def parse_conversation_history(messages: List[Dict[str, str]]) -> str:
    """
    Format conversation history for LLM context.
    
    Args:
        messages: List of message dictionaries with 'role' and 'content'
        
    Returns:
        Formatted conversation history
    """
    formatted = []
    
    for msg in messages:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        
        if role == "user":
            formatted.append(f"User: {content}")
        elif role == "assistant" or role == "bot":
            formatted.append(f"Assistant: {content}")
        else:
            formatted.append(f"{role}: {content}")
    
    return "\n\n".join(formatted)


def create_refactoring_summary(
    original_code: str,
    suggested_code: str,
    issue_description: str
) -> Dict[str, Any]:
    """
    Create a summary of the refactoring changes.
    
    Args:
        original_code: Original code
        suggested_code: Refactored code
        issue_description: Description of the issue
        
    Returns:
        Summary dictionary
    """
    summary = {
        "issue": issue_description,
        "original_lines": len(original_code.split('\n')),
        "suggested_lines": len(suggested_code.split('\n')),
        "changes": []
    }
    
    # Simple diff analysis
    original_lines = original_code.split('\n')
    suggested_lines = suggested_code.split('\n')
    
    # Count added/removed lines
    added = len(suggested_lines) - len(original_lines)
    summary["lines_changed"] = abs(added)
    
    if added > 0:
        summary["changes"].append(f"Added {added} lines")
    elif added < 0:
        summary["changes"].append(f"Removed {abs(added)} lines")
    
    return summary


def validate_solidity_syntax(code: str) -> Dict[str, Any]:
    """
    Perform basic Solidity syntax validation.
    
    Args:
        code: Solidity code to validate
        
    Returns:
        Validation result dictionary
    """
    result = {
        "is_valid": True,
        "errors": [],
        "warnings": []
    }
    
    # Check for basic Solidity structure
    if not code.strip():
        result["is_valid"] = False
        result["errors"].append("Code is empty")
        return result
    
    # Check for pragma
    if "pragma solidity" not in code:
        result["warnings"].append("Missing pragma solidity directive")
    
    # Check for balanced braces
    open_braces = code.count('{')
    close_braces = code.count('}')
    if open_braces != close_braces:
        result["is_valid"] = False
        result["errors"].append(f"Unbalanced braces: {open_braces} opening, {close_braces} closing")
    
    # Check for balanced parentheses
    open_parens = code.count('(')
    close_parens = code.count(')')
    if open_parens != close_parens:
        result["is_valid"] = False
        result["errors"].append(f"Unbalanced parentheses: {open_parens} opening, {close_parens} closing")
    
    return result
