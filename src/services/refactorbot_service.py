import os
import logging
from typing import Dict, Any, List, Tuple
from src.workflows.chatbot_workflow.workflow import chatbot_workflow

logger = logging.getLogger(__name__)


class RefactorBotService:
    """
    Service for providing code refactoring advice using a language model.
    Integrates with the chatbot workflow for LLM-powered refactoring suggestions.
    """

    def __init__(self):
        """
        Initialize the RefactorBot service.
        The chatbot workflow is initialized during app startup.
        """
        self.workflow = chatbot_workflow
        logger.info("RefactorBotService initialized")

    async def get_refactoring_advice(self, code: str, issue_description: str) -> Dict[str, Any]:
        """
        Requests refactoring advice from the LLM based on the provided code and issue.

        Args:
            code: The source code snippet or entire file content to refactor.
            issue_description: A description of the issue or vulnerability found in the code.

        Returns:
            A dictionary containing refactoring suggestions, explanations, or an error message.
            Example:
            {
                "suggestions": [
                    {"type": "inline_fix", "description": "Fix reentrancy by adding reentrancy guard.", "code": "require(!locked, \"ReentrancyGuard: reentrant call\"); locked = true; ... locked = false;"},
                    {"type": "pattern_advice", "description": "Consider using OpenZeppelin's ReentrancyGuard.", "resource_link": "https://docs.openzeppelin.com/contracts/4.x/api/security#ReentrancyGuard"}
                ],
                "explanation": "The current code is vulnerable to reentrancy attacks..."
            }
        """
        try:
            logger.info(f"Requesting refactoring advice for issue: {issue_description}")
            logger.debug(f"Code length: {len(code)} characters")
            
            # Run the chatbot workflow
            result = await self.workflow.arun(
                code=code,
                issue_description=issue_description,
                conversation_history=None
            )
            
            logger.info("Workflow execution completed successfully")
            logger.debug(f"Result keys: {list(result.keys()) if result else 'NONE'}")
            
            # Extract suggestions and explanation from workflow result
            suggestions = result.get("refactoring_suggestions", [])
            explanation = result.get("explanation", "")
            
            logger.info(f"Extracted {len(suggestions)} suggestions")
            
            # Format the response
            return {
                "suggestions": suggestions,
                "explanation": explanation,
                "analysis": result.get("analysis_result", {}),
                "validation": result.get("validation_result", {})
            }
            
        except Exception as e:
            logger.error(f"Error getting refactoring advice: {e}", exc_info=True)
            return {
                "suggestions": [],
                "explanation": f"Error generating refactoring advice: {str(e)}",
                "error": str(e)
            }

    async def get_code_fix_conversation(self, conversation_history: List[Dict[str, str]], current_code: str) -> Dict[str, Any]:
        """
        Engages in a conversation with the LLM to iteratively fix code.

        Args:
            conversation_history: A list of previous messages in the chat (user and bot).
                                  Example: [{"role": "user", "content": "fix this"}, {"role": "bot", "content": "try this"}]
            current_code: The current state of the code being discussed.

        Returns:
            A dictionary containing the bot's response, which could be a question, a suggestion,
            or a refined code snippet.
        """
        try:
            logger.info(f"Continuing conversation with {len(conversation_history)} previous messages")
            
            # Extract issue description from conversation if available
            issue_description = None
            if conversation_history:
                # Try to infer issue from first user message
                first_user_msg = next((msg for msg in conversation_history if msg.get("role") == "user"), None)
                if first_user_msg:
                    issue_description = first_user_msg.get("content", "code refactoring")
            
            # Run the chatbot workflow with conversation history
            result = await self.workflow.arun(
                code=current_code,
                issue_description=issue_description,
                conversation_history=conversation_history
            )
            
            # Extract bot response
            bot_message = result.get("bot_message", "")
            suggested_code = result.get("suggested_code", None)
            
            response = {
                "bot_message": bot_message
            }
            
            if suggested_code:
                response["suggested_code"] = suggested_code
            
            return response
            
        except Exception as e:
            logger.error(f"Error in conversation handling: {e}")
            return {
                "bot_message": f"I encountered an error while processing your request: {str(e)}",
                "error": str(e)
            }

    def validate_suggested_refactoring(self, original_code: str, suggested_code: str) -> Tuple[bool, str]:
        """
        Performs basic validation on the suggested refactored code.
        (e.g., syntax check, diff analysis)

        Args:
            original_code: The code before refactoring.
            suggested_code: The proposed refactored code.

        Returns:
            A tuple of (is_valid, validation_message).
        """
        from src.workflows.chatbot_workflow.utils.helper import validate_solidity_syntax
        
        # Basic checks
        if not suggested_code.strip():
            return False, "Suggested code cannot be empty."
        
        if original_code == suggested_code:
            return False, "Suggested code is identical to original code."
        
        # Perform Solidity syntax validation
        validation_result = validate_solidity_syntax(suggested_code)
        
        if not validation_result["is_valid"]:
            errors = "; ".join(validation_result["errors"])
            return False, f"Syntax validation failed: {errors}"
        
        if validation_result["warnings"]:
            warnings = "; ".join(validation_result["warnings"])
            return True, f"Basic validation passed with warnings: {warnings}"
        
        return True, "Validation passed successfully."



