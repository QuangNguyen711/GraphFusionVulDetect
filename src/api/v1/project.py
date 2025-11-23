import hashlib
import logging
from typing import List, Optional
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from bson import ObjectId
from ..schema.entity import (
    ProjectCreate, ProjectUpdate, Project, ProjectResponse, 
    ProjectFile, ProjectStatus, UserInDB, AnalysisSession
)
from ...resource.database import get_projects_collection, get_analysis_sessions_collection
from ...utils.timezone import now_utc, now_vietnam, ensure_utc_for_db, to_vietnam
from .authentication import get_current_user

router = APIRouter(prefix="/projects", tags=["projects"])
logger = logging.getLogger("GraphFusionVulDetect-Projects")


def serialize_project(project_doc: dict) -> dict:
    """Convert MongoDB document to serializable dict"""
    if "_id" in project_doc:
        project_doc["id"] = str(project_doc["_id"])
        del project_doc["_id"]
    return project_doc


@router.post("/", response_model=ProjectResponse)
async def create_project(
    project_data: ProjectCreate,
    current_user: UserInDB = Depends(get_current_user)
):
    """Create a new project"""
    projects_collection = await get_projects_collection()
    
    # Check if user already has a project with this name
    existing_project = await projects_collection.find_one({
        "user_id": current_user.id,
        "name": project_data.name
    })
    
    if existing_project:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A project with this name already exists"
        )
    
    # Create project document
    project_doc = {
        "name": project_data.name,
        "description": project_data.description,
        "user_id": current_user.id,
        "status": ProjectStatus.CREATED,
        "files": [],
        "analysis_count": 0,
        "created_at": ensure_utc_for_db(now_vietnam()),
        "updated_at": ensure_utc_for_db(now_vietnam())
    }
    
    # Insert project into database
    result = await projects_collection.insert_one(project_doc)
    project_doc["_id"] = result.inserted_id
    
    # Return project response
    return ProjectResponse(
        id=str(project_doc["_id"]),
        name=project_doc["name"],
        description=project_doc["description"],
        status=project_doc["status"],
        files_count=len(project_doc["files"]),
        analysis_count=project_doc["analysis_count"],
        created_at=to_vietnam(project_doc["created_at"]),
        updated_at=to_vietnam(project_doc["updated_at"])
    )


@router.get("/", response_model=List[ProjectResponse])
async def list_projects(
    skip: int = 0,
    limit: int = 20,
    status: Optional[ProjectStatus] = None,
    current_user: UserInDB = Depends(get_current_user)
):
    """List user's projects"""
    projects_collection = await get_projects_collection()
    
    # Build query
    query = {"user_id": current_user.id}
    if status:
        query["status"] = status
    
    # Execute query
    cursor = projects_collection.find(query).sort("updated_at", -1).skip(skip).limit(limit)
    projects = await cursor.to_list(length=limit)
    
    # Convert to response format
    return [
        ProjectResponse(
            id=str(project["_id"]),
            name=project["name"],
            description=project.get("description"),
            status=project["status"],
            files_count=len(project.get("files", [])),
            analysis_count=project.get("analysis_count", 0),
            created_at=to_vietnam(project["created_at"]),
            updated_at=to_vietnam(project["updated_at"])
        )
        for project in projects
    ]


@router.get("/{project_id}", response_model=Project)
async def get_project(
    project_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """Get a specific project"""
    projects_collection = await get_projects_collection()
    
    try:
        project_doc = await projects_collection.find_one({
            "_id": ObjectId(project_id),
            "user_id": current_user.id
        })
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid project ID"
        )
    
    if not project_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    project_doc = serialize_project(project_doc)
    return Project(**project_doc)


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    project_data: ProjectUpdate,
    current_user: UserInDB = Depends(get_current_user)
):
    """Update a project"""
    projects_collection = await get_projects_collection()
    
    try:
        # Check if project exists and belongs to user
        existing_project = await projects_collection.find_one({
            "_id": ObjectId(project_id),
            "user_id": current_user.id
        })
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid project ID"
        )
    
    if not existing_project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Build update data
    update_data = {"updated_at": ensure_utc_for_db(now_vietnam())}
    
    if project_data.name is not None:
        # Check for name conflicts
        name_conflict = await projects_collection.find_one({
            "user_id": current_user.id,
            "name": project_data.name,
            "_id": {"$ne": ObjectId(project_id)}
        })
        if name_conflict:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A project with this name already exists"
            )
        update_data["name"] = project_data.name
    
    if project_data.description is not None:
        update_data["description"] = project_data.description
    
    if project_data.status is not None:
        update_data["status"] = project_data.status
    
    # Update project
    await projects_collection.update_one(
        {"_id": ObjectId(project_id)},
        {"$set": update_data}
    )
    
    # Get updated project
    updated_project = await projects_collection.find_one({"_id": ObjectId(project_id)})
    
    return ProjectResponse(
        id=str(updated_project["_id"]),
        name=updated_project["name"],
        description=updated_project.get("description"),
        status=updated_project["status"],
        files_count=len(updated_project.get("files", [])),
        analysis_count=updated_project.get("analysis_count", 0),
        created_at=to_vietnam(updated_project["created_at"]),
        updated_at=to_vietnam(updated_project["updated_at"])
    )


@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """Delete a project"""
    projects_collection = await get_projects_collection()
    
    try:
        result = await projects_collection.delete_one({
            "_id": ObjectId(project_id),
            "user_id": current_user.id
        })
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid project ID"
        )
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    return {"message": "Project deleted successfully"}


@router.post("/{project_id}/files", response_model=ProjectFile)
async def add_file_to_project(
    project_id: str,
    file: UploadFile = File(...),
    current_user: UserInDB = Depends(get_current_user)
):
    """Add a file to a project"""
    projects_collection = await get_projects_collection()
    
    try:
        # Check if project exists and belongs to user
        project_doc = await projects_collection.find_one({
            "_id": ObjectId(project_id),
            "user_id": current_user.id
        })
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid project ID"
        )
    
    if not project_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Read file content and calculate hash
    file_content = await file.read()
    file_hash = hashlib.sha256(file_content).hexdigest()
    
    # Create file info
    project_file = ProjectFile(
        filename=file.filename,
        file_size=len(file_content),
        file_path="",  # Will be set when file is saved during analysis
        file_hash=file_hash,
        uploaded_at=ensure_utc_for_db(now_vietnam())
    )
    
    # Update project with new file
    await projects_collection.update_one(
        {"_id": ObjectId(project_id)},
        {
            "$push": {"files": project_file.dict()},
            "$set": {"updated_at": ensure_utc_for_db(now_vietnam())}
        }
    )
    
    return project_file


@router.get("/{project_id}/files", response_model=List[ProjectFile])
async def list_project_files(
    project_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """List files in a project"""
    project = await get_project(project_id, current_user)
    return project.files


@router.get("/{project_id}/sessions", response_model=List[AnalysisSession])
async def get_project_analysis_sessions(
    project_id: str,
    skip: int = 0,
    limit: int = 20,
    current_user: UserInDB = Depends(get_current_user)
):
    """Get analysis sessions for a specific project"""
    # First verify user has access to the project
    await get_project(project_id, current_user)
    
    sessions_collection = await get_analysis_sessions_collection()
    
    # Build query for this project
    query = {
        "project_id": project_id,
        "user_id": current_user.id
    }
    
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
