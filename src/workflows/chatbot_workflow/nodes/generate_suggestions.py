"""
Generate refactoring suggestions node for the chatbot workflow.
"""

import logging
import re
from langchain_core.runnables import RunnableConfig
from src.workflows.chatbot_workflow.graph.state import State


logger = logging.getLogger(__name__)


def generate_refactoring_suggestions(state: State, config: RunnableConfig) -> State:
    """
    Generate specific refactoring suggestions based on the analysis.
    
    Args:
        state: Current workflow state
        config: Runnable configuration containing LLM client
        
    Returns:
        Updated state with refactoring suggestions
    """
    llm_client = config["configurable"].get("llm_client")
    code = state.get("code", "")
    issue_description = state.get("issue_description", "")
    analysis_result = state.get("analysis_result", {})
    
    if not llm_client:
        logger.error("LLM client not found in config")
        state["refactoring_suggestions"] = []
        state["explanation"] = "LLM client not configured"
        return state
    
    try:
        llm = llm_client.get_instance()
        print(f"Got LLM instance for generating suggestions")
        
        # Build the prompt based on the issue type
        prompt = (
            "You are a world-class smart contract security expert. "
            "Provide specific refactoring suggestions for the following Solidity code.\n\n"
            f"Code:\n```solidity\n{code}\n```\n\n"
            f"Issue: {issue_description}\n\n"
        )
        
        if analysis_result.get("analysis"):
            prompt += f"Previous Analysis:\n{analysis_result['analysis']}\n\n"
        
        prompt += (
            "Provide:\n"
            "1. **Specific Code Fixes**: Show exactly what code to change. YOU MUST WRAP THE CODE IN A MARKDOWN BLOCK like this:\n"
            "```solidity\n"
            "// ... your corrected code here ...\n"
            "```\n"
            "2. **Pattern Advice**: Suggest design patterns or best practices\n"
            "3. **Security Recommendations**: Additional security improvements\n"
            "4. **Resource Links**: Relevant documentation or examples\n\n"
            "Format your response clearly with these sections."
        )
        
        print(f"Sending prompt to LLM for suggestions (length: {len(prompt)} chars)")
        
        response = llm.invoke(prompt)
        print(f"Received response from LLM")
        
        # Log substantial part of the response for debugging
        response_preview = response.content if response.content else 'NONE'
        print(f"Response preview: {response_preview}...")
        
        answer = response.content.strip() if response.content else ""
        
        # Clean up the response
        if "</think>" in answer:
            answer = answer.split("</think>")[1].strip()
        
        if not answer:
            logger.error(f"LLM returned empty response! Full response: {response}")
            raise ValueError("LLM returned empty response")
        
        # Parse suggestions
        suggestions = _parse_suggestions(answer, issue_description)
        
        # Extract suggested code from code_fix suggestions
        suggested_code = None
        for suggestion in suggestions:
            if suggestion.get("type") == "code_fix" and suggestion.get("code"):
                suggested_code = suggestion["code"]
                break
        
        if not suggested_code:
            # Emergency extraction: look for any large block of code-like text if regex failed
            # This helps if the LLM forgot the backticks but provided indentation or brackets
            print("WARNING: No code block found in standard format. Attempting fallback extraction...")
            # Look for function definition
            function_pattern = re.search(r'(function\s+\w+\s*\(.*?\)\s*(?:internal|public|external|private).*?\{)', answer, re.DOTALL)
            if function_pattern and "```" not in answer:
                # If we see a function signature but no backticks, it might be plain text code
                # Try to grab from the function start to the end or next double newline
                start_index = function_pattern.start()
                # Simple heuristic: take next 500 chars or until end
                fallback_code = answer[start_index:]
                suggestions.append({
                    "type": "code_fix",
                    "description": "Fallback extracted code",
                    "code": fallback_code
                })
                suggested_code = fallback_code
                print("Fallback extractions successful (heuristics used)")

        state["refactoring_suggestions"] = suggestions
        state["explanation"] = answer
        state["suggested_code"] = suggested_code  # Set suggested code or None
        state["bot_message"] = f"I've analyzed the code and found the following suggestions for {issue_description}:"
        
        print(f"Generated {len(suggestions)} refactoring suggestions")
        print(f"Suggested code extracted: {bool(suggested_code)}")
        if suggested_code:
            print(f"Suggested code length: {len(suggested_code)}")
        else:
            print("debug: Full Answer that failed extraction:\n" + answer + "\n---END DEBUG---")
        
    except Exception as e:
        logger.error(f"Error generating suggestions: {e}", exc_info=True)
        logger.error(f"State at error: code_length={len(code)}, issue={issue_description}")
        state["refactoring_suggestions"] = []
        state["explanation"] = f"Error generating suggestions: {str(e)}"
        if llm_client and 'llm' in locals():
            logger.warning(f"Removing faulty LLM client from pool")
            llm_client.remove_instance(llm)
    
    return state


def _parse_suggestions(llm_response: str, issue_type: str) -> list:
    """
    Parse LLM response into structured suggestions.
    
    Args:
        llm_response: Raw LLM response text
        issue_type: Type of issue being addressed
        
    Returns:
        List of suggestion dictionaries
    """
    suggestions = []
    
    # Extract code blocks - simplified and more robust strategy
    # Strategy: Find all blocks between triple backticks, then clean up the language identifier
    code_blocks = re.findall(r'```(.*?)\s*```', llm_response, re.DOTALL)
    
    if code_blocks:
        print(f"DEBUG: Found {len(code_blocks)} code blocks via regex")
        for i, code in enumerate(code_blocks):
            # Clean up potential artifacts
            code = code.strip()
            
            # Common language identifiers to strip
            # We split by newline. If the first line is just a language identifier, we remove it.
            if '\n' in code:
                first_line, rest = code.split('\n', 1)
                cleaned_first_line = first_line.strip().lower()
                # Check if first line looks like a language ID (no spaces, alphanumeric)
                if cleaned_first_line in ['solidity', 'sol', 'javascript', 'js', 'typescript', 'ts', 'python', 'py']:
                    code = rest.strip()
            elif code.strip().lower() in ['solidity', 'sol']:
                # The entire block is just the language ID? invalid.
                continue
                
            suggestions.append({
                "type": "code_fix",
                "description": f"Refactored code for {issue_type}",
                "code": code
            })
    else:
        print("DEBUG: No code blocks found via standard regex.")
    
    # Look for pattern advice
    if "pattern" in llm_response.lower() or "best practice" in llm_response.lower():
        suggestions.append({
            "type": "pattern_advice",
            "description": "Design pattern or best practice recommendation",
            "content": llm_response
        })
    
    # Look for links
    links = re.findall(r'https?://[^\s\)]+', llm_response)
    if links:
        for link in links:
            suggestions.append({
                "type": "resource_link",
                "description": "External resource",
                "url": link
            })
    
    # If no structured suggestions found, add the full response
    if not suggestions:
        suggestions.append({
            "type": "general_advice",
            "description": "General refactoring advice",
            "content": llm_response
        })
    
    return suggestions
