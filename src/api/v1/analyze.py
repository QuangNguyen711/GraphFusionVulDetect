import os
import tempfile
import logging
import hashlib
import json
from typing import List
from pathlib import Path
from datetime import datetime, timezone

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Form
from fastapi.responses import StreamingResponse
from bson import ObjectId
from ...services.analysis_service import vulnerability_analysis_service
from ..schema.entity import (
    StreamingNodeOutput, AnalysisSession, AnalysisSessionCreate,
    AnalysisSessionStatus, AnalysisStep, ProjectFile, UserInDB
)
from ..database import get_analysis_sessions_collection, get_projects_collection
from .authentication import get_current_user

router = APIRouter()

# Setup logging
logger = logging.getLogger("GraphFusionVulDetect-API")

@router.post("/analyze")
async def analyze_contract(
    file: UploadFile = File(..., description="Solidity file to analyze"),
    project_id: str = Form(None, description="Optional project ID to associate the analysis with"),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Upload and analyze a Solidity smart contract file for vulnerabilities.
    
    This endpoint accepts a Solidity file upload and streams the analysis process
    in real-time using NDJSON format.
    
    Args:
        file: Solidity file to analyze
        project_id: Optional project ID to associate the analysis with
        current_user: Current authenticated user
    
    Returns:
        StreamingResponse: NDJSON stream of analysis progress and results
    """
    
    # Log received project_id for debugging
    logger.info(f"Analysis request - project_id: {project_id}, file: {file.filename}")
    
    # Read file content
    file_content = await file.read()
    
    # Validate file
    is_valid, error_message = vulnerability_analysis_service.validate_solidity_file(
        file.filename, file_content
    )
    
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_message)
    
    # Create analysis session
    sessions_collection = await get_analysis_sessions_collection()
    projects_collection = await get_projects_collection()
    
    # Validate project if provided
    if project_id:
        try:
            project_doc = await projects_collection.find_one({
                "_id": ObjectId(project_id),
                "user_id": current_user.id
            })
            if not project_doc:
                raise HTTPException(
                    status_code=404,
                    detail="Project not found or access denied"
                )
        except Exception as e:
            if "ObjectId" in str(e):
                raise HTTPException(status_code=400, detail="Invalid project ID format")
            raise
    
    # Create directory for this analysis
    temp_dir = f"./storage/{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    os.makedirs(temp_dir, exist_ok=True)
    
    # Save file and get path
    file_path = os.path.join(temp_dir, file.filename)
    with open(file_path, 'wb') as f:
        f.write(file_content)
    
    # Calculate file hash
    file_hash = hashlib.sha256(file_content).hexdigest()
    
    # Create analysis session
    session_doc = {
        "project_id": project_id,
        "user_id": current_user.id,
        "file_path": file_path,
        "filename": file.filename,
        "file_hash": file_hash,
        "status": AnalysisSessionStatus.PROCESSING,
        "steps": [],
        "started_at": datetime.now(timezone.utc),
        "completed_at": None,
        "error_message": None
    }
    
    session_result = await sessions_collection.insert_one(session_doc)
    session_id = str(session_result.inserted_id)
    
    # Update project if provided
    if project_id:
        # Add file to project if not already exists
        project_file = ProjectFile(
            filename=file.filename,
            file_size=len(file_content),
            file_path=file_path,
            file_hash=file_hash,
            uploaded_at=datetime.now(timezone.utc)
        )
        
        # Check if file already exists in project
        existing_file = await projects_collection.find_one({
            "_id": ObjectId(project_id),
            "files.file_hash": file_hash
        })
        
        if not existing_file:
            await projects_collection.update_one(
                {"_id": ObjectId(project_id)},
                {
                    "$push": {"files": project_file.dict()},
                    "$inc": {"analysis_count": 1},
                    "$set": {
                        "updated_at": datetime.now(timezone.utc),
                        "status": "analyzing"
                    }
                }
            )
        else:
            await projects_collection.update_one(
                {"_id": ObjectId(project_id)},
                {
                    "$inc": {"analysis_count": 1},
                    "$set": {
                        "updated_at": datetime.now(timezone.utc),
                        "status": "analyzing"
                    }
                }
            )
    
    # Create streaming generator
    async def stream_analysis():
        try:
            # Stream analysis results and save each step
            async for result_line in vulnerability_analysis_service.analyze_solidity_file(
                file_path, temp_dir
            ):
                # Parse the result
                try:
                    result_data = json.loads(result_line.strip())
                    
                    # Save step to database
                    step = AnalysisStep(
                        step_name=result_data.get("node", "unknown"),
                        status="completed",
                        result_data=result_data.get("output", {}),
                        started_at=datetime.now(timezone.utc),
                        completed_at=datetime.now(timezone.utc)
                    )
                    
                    await sessions_collection.update_one(
                        {"_id": ObjectId(session_id)},
                        {"$push": {"steps": step.dict()}}
                    )
                    
                except json.JSONDecodeError:
                    # Handle non-JSON lines
                    pass
                
                # Send result to client
                yield result_line
            
            # Mark session as completed
            await sessions_collection.update_one(
                {"_id": ObjectId(session_id)},
                {
                    "$set": {
                        "status": AnalysisSessionStatus.COMPLETED,
                        "completed_at": datetime.now(timezone.utc)
                    }
                }
            )
            
            # Update project status if provided
            if project_id:
                await projects_collection.update_one(
                    {"_id": ObjectId(project_id)},
                    {
                        "$set": {
                            "status": "completed",
                            "updated_at": datetime.now(timezone.utc)
                        }
                    }
                )
                
        except Exception as e:
            logger.error(f"Analysis error: {str(e)}", exc_info=True)
            
            # Mark session as failed
            await sessions_collection.update_one(
                {"_id": ObjectId(session_id)},
                {
                    "$set": {
                        "status": AnalysisSessionStatus.FAILED,
                        "completed_at": datetime.now(timezone.utc),
                        "error_message": str(e)
                    }
                }
            )
            
            # Update project status if provided
            if project_id:
                await projects_collection.update_one(
                    {"_id": ObjectId(project_id)},
                    {
                        "$set": {
                            "status": "failed",
                            "updated_at": datetime.now(timezone.utc)
                        }
                    }
                )
            
            # Send error as final message
            error_output = {
                "node": "error",
                "output": {
                    "error": f"Analysis failed: {str(e)}",
                    "session_id": session_id
                }
            }
            yield f"{json.dumps(error_output)}\n"
    
    return StreamingResponse(
        stream_analysis(), 
        media_type="application/x-ndjson",
        headers={"X-Session-ID": session_id}
    )


@router.get("/sessions", response_model=List[AnalysisSession])
async def list_analysis_sessions(
    project_id: str = None,
    skip: int = 0,
    limit: int = 20,
    current_user: UserInDB = Depends(get_current_user)
):
    """List analysis sessions for the current user"""
    sessions_collection = await get_analysis_sessions_collection()
    
    # Build query
    query = {"user_id": current_user.id}
    if project_id:
        try:
            query["project_id"] = project_id
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid project ID format")
    
    # Execute query
    cursor = sessions_collection.find(query).sort("started_at", -1).skip(skip).limit(limit)
    sessions = await cursor.to_list(length=limit)
    
    # Convert to response format
    result = []
    for session in sessions:
        session["id"] = str(session["_id"])
        del session["_id"]
        result.append(AnalysisSession(**session))
    
    return result


@router.get("/sessions/{session_id}", response_model=AnalysisSession)
async def get_analysis_session(
    session_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """Get a specific analysis session"""
    sessions_collection = await get_analysis_sessions_collection()
    
    try:
        session_doc = await sessions_collection.find_one({
            "_id": ObjectId(session_id),
            "user_id": current_user.id
        })
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid session ID format")
    
    if not session_doc:
        raise HTTPException(status_code=404, detail="Analysis session not found")
    
    session_doc["id"] = str(session_doc["_id"])
    del session_doc["_id"]
    return AnalysisSession(**session_doc)


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