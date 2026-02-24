"""
API Router for RefactorBot Service - Smart Contract Refactoring Assistant
"""

import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field

from src.services.refactorbot_service import RefactorBotService
from src.models.entity import UserInDB
from .authentication_router import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/refactor", tags=["refactorbot"])

# Request/Response Models
class RefactoringAdviceRequest(BaseModel):
    """Request model for getting refactoring advice"""
    code: str = Field(..., description="Solidity code to refactor", min_length=1)
    issue_description: str = Field(..., description="Description of the issue or vulnerability", min_length=1)

class RefactoringSuggestion(BaseModel):
    """Model for a single refactoring suggestion"""
    type: str = Field(..., description="Type of suggestion (code_fix, pattern_advice, resource_link, etc.)")
    description: str = Field(..., description="Description of the suggestion")
    code: Optional[str] = Field(None, description="Suggested code snippet if applicable")
    content: Optional[str] = Field(None, description="Additional content or explanation")
    url: Optional[str] = Field(None, description="Resource URL if applicable")

class RefactoringAdviceResponse(BaseModel):
    """Response model for refactoring advice"""
    suggestions: List[RefactoringSuggestion] = Field(default_factory=list, description="List of refactoring suggestions")
    explanation: str = Field(..., description="Detailed explanation of the suggestions")
    analysis: Optional[Dict[str, Any]] = Field(None, description="Analysis results")
    validation: Optional[Dict[str, Any]] = Field(None, description="Validation results")

class ConversationMessage(BaseModel):
    """Model for a conversation message"""
    role: str = Field(..., description="Role of the message sender (user or assistant)")
    content: str = Field(..., description="Content of the message")

class ConversationRequest(BaseModel):
    """Request model for conversation-based refactoring"""
    code: str = Field(..., description="Current code being discussed", min_length=1)
    conversation_history: List[ConversationMessage] = Field(
        ..., 
        description="Previous conversation messages",
        min_items=1
    )

class ConversationResponse(BaseModel):
    """Response model for conversation"""
    bot_message: str = Field(..., description="Bot's response message")
    suggested_code: Optional[str] = Field(None, description="Suggested code snippet if applicable")

class ValidationRequest(BaseModel):
    """Request model for validating refactored code"""
    original_code: str = Field(..., description="Original code before refactoring", min_length=1)
    suggested_code: str = Field(..., description="Suggested refactored code", min_length=1)

class ValidationResponse(BaseModel):
    """Response model for validation"""
    is_valid: bool = Field(..., description="Whether the suggested code is valid")
    message: str = Field(..., description="Validation message or errors")


# Service instance
refactorbot_service = RefactorBotService()


@router.post("/advice", response_model=RefactoringAdviceResponse, status_code=status.HTTP_200_OK)
async def get_refactoring_advice(
    request: RefactoringAdviceRequest,
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Get AI-powered refactoring advice for smart contract code.
    
    This endpoint analyzes the provided Solidity code and generates specific
    refactoring suggestions to address the described issue or vulnerability.
    
    Args:
        request: Contains the code and issue description
        current_user: Current authenticated user
    
    Returns:
        RefactoringAdviceResponse: Suggestions, explanations, and analysis
    
    Raises:
        HTTPException: If analysis fails or encounters an error
    """
    try:
        logger.info(f"Refactoring advice requested by user {current_user.username} for issue: {request.issue_description}")
        logger.debug(f"Code length: {len(request.code)} characters")
        
        # Get refactoring advice from service
        result = await refactorbot_service.get_refactoring_advice(
            code=request.code,
            issue_description=request.issue_description
        )
        
        logger.debug(f"Service returned result with keys: {list(result.keys()) if result else 'NONE'}")
        
        # Check for errors in the result
        if "error" in result:
            logger.error(f"Error generating refactoring advice: {result['error']}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to generate refactoring advice: {result['error']}"
            )
        
        # Convert suggestions to response models
        suggestions = [
            RefactoringSuggestion(**suggestion)
            for suggestion in result.get("suggestions", [])
        ]
        
        response = RefactoringAdviceResponse(
            suggestions=suggestions,
            explanation=result.get("explanation", ""),
            analysis=result.get("analysis"),
            validation=result.get("validation")
        )
        
        logger.info(f"Generated {len(suggestions)} refactoring suggestions successfully")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in get_refactoring_advice: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred: {str(e)}"
        )


@router.post("/conversation", response_model=ConversationResponse, status_code=status.HTTP_200_OK)
async def continue_refactoring_conversation(
    request: ConversationRequest,
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Continue a conversational interaction for iterative code refinement.
    
    This endpoint allows users to have a back-and-forth conversation with the AI
    to iteratively improve and refine their smart contract code.
    
    Args:
        request: Contains the code and conversation history
        current_user: Current authenticated user
    
    Returns:
        ConversationResponse: Bot's message and optional suggested code
    
    Raises:
        HTTPException: If conversation handling fails
    """
    try:
        logger.info(f"Conversation request by user {current_user.username} with {len(request.conversation_history)} messages")
        
        # Convert conversation messages to dict format
        conversation_history = [
            {"role": msg.role, "content": msg.content}
            for msg in request.conversation_history
        ]
        
        # Get conversation response from service
        result = await refactorbot_service.get_code_fix_conversation(
            conversation_history=conversation_history,
            current_code=request.code
        )
        
        # Check for errors
        if "error" in result:
            logger.error(f"Error in conversation: {result['error']}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to process conversation: {result['error']}"
            )
        
        response = ConversationResponse(
            bot_message=result.get("bot_message", ""),
            suggested_code=result.get("suggested_code")
        )
        
        logger.info("Conversation processed successfully")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in continue_refactoring_conversation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred: {str(e)}"
        )


@router.post("/validate", response_model=ValidationResponse, status_code=status.HTTP_200_OK)
async def validate_refactoring(
    request: ValidationRequest,
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Validate suggested refactored code.
    
    This endpoint performs validation checks on the suggested refactored code,
    including syntax validation and basic security checks.
    
    Args:
        request: Contains original and suggested code
        current_user: Current authenticated user
    
    Returns:
        ValidationResponse: Validation result and message
    
    Raises:
        HTTPException: If validation process fails
    """
    try:
        logger.info(f"Validation request by user {current_user.username}")
        
        # Validate the refactored code
        is_valid, message = refactorbot_service.validate_suggested_refactoring(
            original_code=request.original_code,
            suggested_code=request.suggested_code
        )
        
        response = ValidationResponse(
            is_valid=is_valid,
            message=message
        )
        
        logger.info(f"Validation result: {is_valid} - {message}")
        return response
        
    except Exception as e:
        logger.error(f"Unexpected error in validate_refactoring: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred during validation: {str(e)}"
        )
