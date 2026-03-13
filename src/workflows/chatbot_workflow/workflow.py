"""
Chatbot Workflow for Smart Contract Refactoring.

This workflow provides an AI-powered chatbot that helps developers
refactor their Solidity smart contracts by:
1. Analyzing code for vulnerabilities and issues
2. Generating refactoring suggestions
3. Engaging in iterative conversations to refine solutions
4. Validating proposed changes
"""

from src.infrastructure.chat_model.llm_client import LLMClient
from src.workflows.chatbot_workflow.graph.builder import build_graph
from src.config.settings import settings
import logging


logger = logging.getLogger(__name__)


class ChatbotWorkflow:
    """
    Main workflow class for the smart contract refactoring chatbot.
    Manages LLM client initialization and workflow graph construction.
    """
    
    def __init__(self):
        """Initialize the chatbot workflow."""
        self.llm_client = None
        self.graph = None
    
    def initialize(self):
        """
        Initialize the workflow by loading the LLM client.
        Called ONCE during app startup.
        """
        print("Initializing Chatbot Refactoring Workflow...")
        
        try:
            self._load_llm_client()
            print("Chatbot workflow initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize chatbot workflow: {e}")
            raise
    
    def _load_llm_client(self):
        """
        Load and configure the LLM client pool.
        """
        print("Loading LLM client configuration...")
        
        # Get API keys from settings
        # Support multiple keys for load balancing
        api_keys = []
        
        # Primary key
        if hasattr(settings, 'GEMINI_API_KEY1') and settings.GEMINI_API_KEY1:
            api_keys.append(settings.GEMINI_API_KEY1)
            print(f"Found GEMINI_API_KEY1: {settings.GEMINI_API_KEY1[:8]}...")
        else:
            logger.warning("GEMINI_API_KEY1 not found or empty!")
        
        # Support for additional keys (GEMINI_API_KEY2, GEMINI_API_KEY3, etc.)
        for i in range(2, 10):
            key_name = f'GEMINI_API_KEY{i}'
            if hasattr(settings, key_name):
                key = getattr(settings, key_name)
                if key:
                    api_keys.append(key)
                    print(f"Found {key_name}: {key[:8]}...")
        
        if not api_keys:
            logger.error("No API keys found in settings!")
            raise ValueError("No API keys found in settings. Please configure GEMINI_API_KEY1.")
        
        # Get LLM configuration from settings
        base_url = getattr(settings, 'BASE_URL', 'https://api.openai.com/v1')
        model = getattr(settings, 'MODEL_NAME', 'gpt-4')
        temperature = getattr(settings, 'CHATBOT_TEMPERATURE', 0.7)
        max_tokens = getattr(settings, 'CHATBOT_MAX_TOKENS', 4096)
        top_p = getattr(settings, 'CHATBOT_TOP_P', 1.0)
        
        print(f"LLM Configuration:")
        print(f"  Model: {model}")
        print(f"  Base URL: {base_url}")
        print(f"  Temperature: {temperature}")
        print(f"  Max Tokens: {max_tokens}")
        print(f"  Top P: {top_p}")
        
        # Initialize the LLM client pool
        self.llm_client = LLMClient(
            api_keys=api_keys,
            base_url=base_url,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            top_p=top_p,
            add_stop_token=["```\n```", "STOP_REFACTORING"]
        )
        
        print(f"LLM client pool initialized with {len(api_keys)} API key(s)")
        print(f"Using model: {model} at {base_url}")
    
    def build_pipeline(self):
        """
        Build and return the workflow graph.
        Called after initialization to get the executable graph.
        
        Returns:
            Compiled LangGraph StateGraph
        """
        if not self.llm_client:
            raise RuntimeError("Workflow not initialized. Call initialize() first.")
        
        if not self.graph:
            self.graph = build_graph()
            print("Chatbot workflow graph built successfully")
        
        return self.graph
    
    def run(self, code: str, issue_description: str = None, conversation_history: list = None):
        """
        Run the chatbot workflow with the given inputs.
        
        Args:
            code: The Solidity code to analyze and refactor
            issue_description: Optional description of the specific issue to address
            conversation_history: Optional conversation history for iterative refinement
        
        Returns:
            The final state after workflow execution
        """
        if not self.graph:
            self.graph = self.build_pipeline()
        
        # Prepare initial state
        initial_state = {
            "code": code,
            "issue_description": issue_description,
            "conversation_history": conversation_history or [],
            "analysis_result": None,
            "refactoring_suggestions": None,
            "bot_message": None,
            "suggested_code": None,
            "explanation": None,
            "validation_result": None
        }
        
        # Configure with LLM client
        config = {
            "configurable": {
                "llm_client": self.llm_client
            }
        }
        
        try:
            # Execute the workflow
            print("Starting chatbot workflow execution...")
            print(f"Input - Code length: {len(code)} chars, Issue: {issue_description}")
            print(f"Conversation history: {len(conversation_history or [])} messages")
            print(f"Initial state keys: {list(initial_state.keys())}")
            
            result = self.graph.invoke(initial_state, config)
            
            print("Chatbot workflow execution completed")
            print(f"Result keys: {list(result.keys()) if result else 'NONE'}")
            return result
            
        except Exception as e:
            logger.error(f"Error during workflow execution: {e}", exc_info=True)
            logger.error(f"Failed state: code_len={len(code)}, issue={issue_description}")
            raise
    
    async def arun(self, code: str, issue_description: str = None, conversation_history: list = None):
        """
        Async version of run() for use in async contexts.
        
        Args:
            code: The Solidity code to analyze and refactor
            issue_description: Optional description of the specific issue to address
            conversation_history: Optional conversation history for iterative refinement
        
        Returns:
            The final state after workflow execution
        """
        if not self.graph:
            self.graph = self.build_pipeline()
        
        # Prepare initial state
        initial_state = {
            "code": code,
            "issue_description": issue_description,
            "conversation_history": conversation_history or [],
            "analysis_result": None,
            "refactoring_suggestions": None,
            "bot_message": None,
            "suggested_code": None,
            "explanation": None,
            "validation_result": None
        }
        
        # Configure with LLM client
        config = {
            "configurable": {
                "llm_client": self.llm_client
            }
        }
        
        try:
            # Execute the workflow asynchronously
            print("Starting async chatbot workflow execution...")
            print(f"Input - Code length: {len(code)} chars, Issue: {issue_description}")
            print(f"Conversation history: {len(conversation_history or [])} messages")
            print(f"Initial state keys: {list(initial_state.keys())}")
            
            result = await self.graph.ainvoke(initial_state, config)
            
            print("Async chatbot workflow execution completed")
            print(f"Result keys: {list(result.keys()) if result else 'NONE'}")
            return result
            
        except Exception as e:
            logger.error(f"Error during async workflow execution: {e}", exc_info=True)
            logger.error(f"Failed state: code_len={len(code)}, issue={issue_description}")
            raise


# Singleton workflow instance
chatbot_workflow = ChatbotWorkflow()
