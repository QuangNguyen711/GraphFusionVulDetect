"""
Handle conversation node for the chatbot workflow.
"""

import logging
import re
from langchain_core.runnables import RunnableConfig
from src.workflows.chatbot_workflow.graph.state import State


logger = logging.getLogger(__name__)


def handle_conversation(state: State, config: RunnableConfig) -> State:
    """
    Handle conversational interactions for iterative code refinement.
    
    Args:
        state: Current workflow state
        config: Runnable configuration containing LLM client
        
    Returns:
        Updated state with conversation response
    """
    llm_client = config["configurable"].get("llm_client")
    code = state.get("code", "")
    conversation_history = state.get("conversation_history", [])
    
    if not llm_client or not conversation_history:
        return state
    
    try:
        llm = llm_client.get_instance()
        logger.info(f"Got LLM instance for conversation handling")
        
        # Build conversation context
        messages = []
        system_message = (
            "You are a helpful smart contract refactoring assistant. "
            "You help developers improve their Solidity code by providing "
            "clear explanations, code examples, and best practices."
        )
        messages.append({"role": "system", "content": system_message})
        
        # Add conversation history
        for msg in conversation_history:
            messages.append(msg)
        
        # Add current code context
        last_user_message = conversation_history[-1]["content"] if conversation_history else ""
        
        prompt = f"Current code under discussion:\n```solidity\n{code}\n```\n\n{last_user_message}"
        
        logger.info(f"Sending conversation prompt to LLM (history length: {len(conversation_history)})")
        logger.debug(f"Last user message: {last_user_message[:100]}...")
        
        response = llm.invoke(prompt)
        logger.info(f"Received conversation response from LLM")
        logger.debug(f"Response content: {response.content[:200] if response.content else 'NONE'}...")
        
        answer = response.content.strip() if response.content else ""
        
        # Clean up response
        if "</think>" in answer:
            answer = answer.split("</think>")[1].strip()
        
        if not answer:
            logger.error(f"LLM returned empty response in conversation! Full response: {response}")
            raise ValueError("LLM returned empty response")
        
        # Check if response contains code
        if "```solidity" in answer or "```" in answer:
            # Extract code from response
            code_blocks = re.findall(r'```(?:solidity)?\n(.*?)```', answer, re.DOTALL)
            if code_blocks:
                state["suggested_code"] = code_blocks[0].strip()
        
        state["bot_message"] = answer
        
        # Add bot response to conversation history
        updated_history = conversation_history.copy()
        updated_history.append({"role": "assistant", "content": answer})
        state["conversation_history"] = updated_history
        
        logger.info("Conversation handled successfully")
        
    except Exception as e:
        logger.error(f"Error in conversation handling: {e}", exc_info=True)
        logger.error(f"State at error: code_length={len(code)}, history_length={len(conversation_history)}")
        state["bot_message"] = f"I encountered an error: {str(e)}"
        if llm_client and 'llm' in locals():
            logger.warning(f"Removing faulty LLM client from pool")
            llm_client.remove_instance(llm)
    
    return state
