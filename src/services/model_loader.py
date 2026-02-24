from src.workflows.gfd_workflow.workflow import gfd_workflow
from src.workflows.chatbot_workflow.workflow import chatbot_workflow

async def load_all_models():
    # Initialize GFD workflow (vulnerability detection)
    gfd_workflow.initialize()
    
    # Initialize Chatbot workflow (refactoring assistance)
    chatbot_workflow.initialize()