import os
import tempfile
import logging
from typing import List
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from ...services.analysis_service import vulnerability_analysis_service
from ..schema.entity import StreamingNodeOutput

router = APIRouter()

# Setup logging
logger = logging.getLogger("GraphFusionVulDetect-API")

@router.post("/analyze")
async def analyze_contract(file: UploadFile = File(..., description="Solidity file to analyze")):
    """
    Upload and analyze a Solidity smart contract file for vulnerabilities.
    
    This endpoint accepts a Solidity file upload and streams the analysis process
    in real-time using NDJSON format.
    
    Returns:
        StreamingResponse: NDJSON stream of analysis progress and results
    """
    
    # Read file content
    file_content = await file.read()
    
    # Validate file
    is_valid, error_message = vulnerability_analysis_service.validate_solidity_file(
        file.filename, file_content
    )
    
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_message)
    
    # Create streaming generator
    async def stream_analysis():
        from datetime import datetime
        temp_dir = f"./storage/{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        os.makedirs(temp_dir, exist_ok=True)
        try:
            # Save uploaded file
            file_path = await vulnerability_analysis_service.save_uploaded_file(
                file_content, file.filename, temp_dir
            )
            
            # Stream analysis results
            async for result_line in vulnerability_analysis_service.analyze_solidity_file(
                file_path, temp_dir
            ):
                yield result_line
                
        except Exception as e:
            logger.error(f"Analysis error: {str(e)}", exc_info=True)
            # Send error as final message
            error_output = {
                "node": "error",
                "output": {
                    "error": f"Analysis failed: {str(e)}"
                }
            }
            yield f"{error_output}\n"
    
    return StreamingResponse(stream_analysis(), media_type="application/x-ndjson")


@router.get("/health")
async def analysis_health_check():
    """Check if analysis service is ready"""
    try:
        # Try to initialize the service to check if models are loaded
        vulnerability_analysis_service._initialize_if_needed()
        return {
            "status": "ready",
            "message": "Analysis service is ready to process requests"
        }
    except Exception as e:
        return {
            "status": "not_ready",
            "message": f"Analysis service is not ready: {str(e)}"
        }