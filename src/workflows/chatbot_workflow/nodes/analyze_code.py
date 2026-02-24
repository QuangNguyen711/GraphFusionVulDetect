"""
Analyze code node for the chatbot workflow.
"""

import logging
from langchain_core.runnables import RunnableConfig
from src.workflows.chatbot_workflow.graph.state import State


logger = logging.getLogger(__name__)


def analyze_code(state: State, config: RunnableConfig) -> State:
    """
    Analyze the code and issue description to understand the context.
    
    Args:
        state: Current workflow state
        config: Runnable configuration containing LLM client
        
    Returns:
        Updated state with analysis results
    """
    llm_client = config["configurable"].get("llm_client")
    code = state.get("code", "")
    issue_description = state.get("issue_description", "")
    
    if not llm_client:
        logger.error("LLM client not found in config")
        state["analysis_result"] = {"error": "LLM client not configured"}
        return state
    
    if not code:
        state["analysis_result"] = {"error": "No code provided"}
        return state
    
    # Get an LLM instance from the client pool
    try:
        llm = llm_client.get_instance()
        logger.info(f"Got LLM instance: {type(llm).__name__}")
        
        prompt = (
            "You are an expert smart contract security auditor. "
            "Analyze the following Solidity code and identify potential issues.\n\n"
            f"Code:\n```solidity\n{code}\n```\n\n"
        )
        
        if issue_description:
            prompt += f"Specific issue to focus on: {issue_description}\n\n"
        
        prompt += (
            "Provide a brief analysis covering:\n"
            "1. Code structure and quality\n"
            "2. Potential vulnerabilities or issues\n"
            "3. Areas that need refactoring\n"
        )
        
        logger.info(f"Sending prompt to LLM (length: {len(prompt)} chars)")
        logger.debug(f"Prompt: {prompt[:200]}...")
        
        response = llm.invoke(prompt)
        logger.info(f"Received response: {type(response).__name__}")
        logger.debug(f"Response content type: {type(response.content) if hasattr(response, 'content') else 'N/A'}")
        logger.debug(f"Response content: {response.content[:200] if response.content else 'NONE'}...")
        
        answer = response.content.strip() if response.content else ""
        
        # Clean up the response if it contains thinking tags
        if "</think>" in answer:
            answer = answer.split("</think>")[1].strip()
        
        if not answer:
            logger.error(f"LLM returned empty response! Full response object: {response}")
            raise ValueError("LLM returned empty response")
        
        state["analysis_result"] = {
            "analysis": answer,
            "code_length": len(code),
            "has_issue": bool(issue_description)
        }
        
        logger.info("Code analysis completed successfully")
        
    except Exception as e:
        logger.error(f"Error during code analysis: {e}", exc_info=True)
        logger.error(f"State at error: code_length={len(code)}, issue_desc={issue_description}")
        state["analysis_result"] = {"error": f"Analysis failed: {str(e)}"}
        # Remove faulty client from pool if needed
        if llm_client and 'llm' in locals():
            logger.warning(f"Removing faulty LLM client from pool")
            llm_client.remove_instance(llm)
    
    return state
