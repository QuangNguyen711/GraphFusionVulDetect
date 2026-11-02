import json
import tempfile
import os
from typing import AsyncGenerator, Dict, Any, Tuple
from anyio import to_thread

# Define a unique sentinel object to signal the end of the iterator
_SENTINEL = object()

class VulnerabilityAnalysisService:
    """Service for handling vulnerability analysis operations"""
    
    def __init__(self):
        self.app_graph = None
        self.config = None
        
    def _initialize_if_needed(self):
        """Initialize models if not already done"""
        if self.app_graph is None or self.config is None:
            # Import here to avoid circular imports
            from .graph_loader import get_app_graph, get_models_config
            
            self.app_graph = get_app_graph()
            self.config = get_models_config()
            
            if self.app_graph is None or self.config is None:
                raise RuntimeError("Models not loaded. Please ensure the application has started properly.")
    
    def _get_next_or_sentinel(self, sync_iterator):
        """
        Calls next() on the iterator. If StopIteration is raised,
        returns the sentinel value instead.
        """
        try:
            return next(sync_iterator)
        except StopIteration:
            return _SENTINEL
    
    async def _run_sync_iterator_in_thread(self, sync_iterator) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Wraps a synchronous iterator in an async generator, running the
        blocking `next()` calls in a separate thread using a sentinel
        to gracefully handle the end of the iterator.
        """
        while True:
            # Run our helper in a worker thread. It will return an item
            # or the sentinel when the iterator is exhausted.
            item = await to_thread.run_sync(self._get_next_or_sentinel, sync_iterator)

            if item is _SENTINEL:
                # The iterator is exhausted, so we're done.
                break
            else:
                # We have a valid item, yield it.
                yield item
    
    def _format_node_output(self, node_name: str, node_output_state: Dict[str, Any]) -> Dict[str, Any]:
        """
        Format the output from each node to provide clean data to the client
        """
        output_data = {"node": node_name, "output": {}}
        
        if "error" in node_output_state:
            output_data["output"]["error"] = node_output_state["error"]
        elif node_name == "convert_to_fcg":
            output_data["output"] = {
                k: v for k, v in node_output_state.items() 
                if k in ["fcg_file_path", "mapping_file_path"]
            }
        elif node_name == "detect_vulnerability_src":
            output_data["output"] = {
                k: v for k, v in node_output_state.items() 
                if k in ["predicted_class", "confidence_score"]
            }
        elif node_name == "detect_vulnerability_func":
            output_data["output"] = {
                k: v for k, v in node_output_state.items() 
                if k in ["func_vulnerability_predictions", "fcg_edges"]
            }
        elif node_name == "explain_vulnerability_func":
            output_data["output"] = {
                "explanations": node_output_state.get("func_vulnerability_explanations")
            }
        else:
            # For any other nodes, include all non-internal data
            output_data["output"] = {
                k: v for k, v in node_output_state.items() 
                if not k.startswith('_')
            }
        
        return output_data
    
    async def analyze_solidity_file(self, file_path: str, temp_dir: str) -> AsyncGenerator[str, None]:
        """
        Analyze a Solidity file and stream results as NDJSON
        
        Args:
            file_path: Path to the Solidity file
            temp_dir: Temporary directory for storing intermediate files
            
        Yields:
            JSON strings containing analysis progress and results
        """
        self._initialize_if_needed()
        
        # Create initial state for the graph
        initial_state = {
            "sol_file_path": file_path, 
            "fcg_save_dir": temp_dir
        }
        
        # Stream analysis results
        async for event in self._run_sync_iterator_in_thread(
            self.app_graph.stream(initial_state, self.config)
        ):
            node_name, node_output_state = list(event.items())[0]
            
            # Format output for this processing step
            output_data = self._format_node_output(node_name, node_output_state)
            
            # Yield as NDJSON line
            yield json.dumps(output_data) + "\n"
    
    async def save_uploaded_file(self, file_content: bytes, filename: str, temp_dir: str) -> str:
        """
        Save uploaded file content to a temporary location
        
        Args:
            file_content: Raw file content
            filename: Original filename
            temp_dir: Temporary directory to save the file
            
        Returns:
            Path to the saved file
        """
        file_path = os.path.join(temp_dir, filename)
        print(f"Saving uploaded file to: {file_path}")
        print(f"content: {file_content[:100]}...")
        # Save file content
        with open(file_path, "wb") as buffer:
            buffer.write(file_content)
            
        return file_path
    
    def validate_solidity_file(self, filename: str, content: bytes) -> Tuple[bool, str]:
        """
        Validate uploaded Solidity file
        
        Args:
            filename: Name of the uploaded file
            content: File content
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        # Check file extension
        if not filename.endswith(".sol"):
            return False, "Invalid file type. Please upload a .sol file."
        
        # Check file size (limit to 10MB)
        if len(content) > 10 * 1024 * 1024:  # 10MB
            return False, "File size must be less than 10MB"
        
        # Check if file is not empty
        if len(content) == 0:
            return False, "File cannot be empty"
        
        # Basic content validation (check if it contains some Solidity-like content)
        try:
            content_str = content.decode('utf-8')
            if 'contract' not in content_str.lower() and 'pragma solidity' not in content_str.lower():
                return False, "File does not appear to be a valid Solidity contract"
        except UnicodeDecodeError:
            return False, "File must be a valid text file"
        
        return True, ""

# Singleton service instance
vulnerability_analysis_service = VulnerabilityAnalysisService()
