from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field, EmailStr
from enum import Enum
from datetime import datetime

# Authentication schemas
class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, description="Username for the account")
    email: EmailStr = Field(..., description="Email address for the account")
    password: str = Field(..., min_length=6, description="Password for the account")
    full_name: Optional[str] = Field(default=None, max_length=100, description="Full name of the user")

class UserLogin(BaseModel):
    username: str = Field(..., description="Username or email")
    password: str = Field(..., description="Password")

class Token(BaseModel):
    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(..., description="Token expiration time in seconds")

class TokenData(BaseModel):
    username: Optional[str] = None
    user_id: Optional[str] = None

class UserProfile(BaseModel):
    user_id: Optional[str] = Field(default=None, description="The unique identifier of the user")
    username: Optional[str] = Field(default=None, description="The user's login name")
    email: Optional[str] = Field(default=None, description="The user's email address")
    full_name: Optional[str] = Field(default=None, description="The user's full name")
    bio: Optional[str] = Field(default=None, description="A short bio of the user")
    created_at: Optional[datetime] = Field(default=None, description="Account creation timestamp")
    last_login: Optional[datetime] = Field(default=None, description="Last login timestamp")

class UserInDB(BaseModel):
    id: str = Field(..., alias="_id")
    username: str
    email: str
    full_name: Optional[str] = None
    hashed_password: str
    is_active: bool = True
    created_at: datetime
    last_login: Optional[datetime] = None

# Project related schemas
class ProjectStatus(str, Enum):
    CREATED = "created"
    ANALYZING = "analyzing"
    COMPLETED = "completed"
    FAILED = "failed"

class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Project name")
    description: Optional[str] = Field(default=None, max_length=500, description="Project description")

class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100, description="Project name")
    description: Optional[str] = Field(default=None, max_length=500, description="Project description")
    status: Optional[ProjectStatus] = Field(default=None, description="Project status")

class ProjectFile(BaseModel):
    filename: str = Field(..., description="Name of the uploaded file")
    file_size: int = Field(..., description="Size of the file in bytes")
    file_path: str = Field(..., description="Path where the file is stored")
    file_hash: str = Field(..., description="Hash of the file content")
    uploaded_at: datetime = Field(default_factory=datetime.now, description="Upload timestamp")

class Project(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id", description="Unique project identifier")
    name: str = Field(..., description="Project name")
    description: Optional[str] = Field(default=None, description="Project description")
    user_id: str = Field(..., description="ID of the user who created the project")
    status: ProjectStatus = Field(default=ProjectStatus.CREATED, description="Project status")
    files: List[ProjectFile] = Field(default_factory=list, description="Files associated with the project")
    analysis_count: int = Field(default=0, description="Number of analyses performed")
    created_at: datetime = Field(default_factory=datetime.now, description="Project creation timestamp")
    updated_at: datetime = Field(default_factory=datetime.now, description="Project last update timestamp")

class ProjectResponse(BaseModel):
    id: str = Field(..., description="Unique project identifier")
    name: str = Field(..., description="Project name")
    description: Optional[str] = Field(default=None, description="Project description")
    status: ProjectStatus = Field(..., description="Project status")
    files_count: int = Field(..., description="Number of files in the project")
    analysis_count: int = Field(..., description="Number of analyses performed")
    created_at: datetime = Field(..., description="Project creation timestamp")
    updated_at: datetime = Field(..., description="Project last update timestamp")

# Analysis session related schemas
class AnalysisSessionStatus(str, Enum):
    CREATED = "created"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class AnalysisSessionCreate(BaseModel):
    project_id: str = Field(..., description="ID of the project this analysis belongs to")
    file_path: str = Field(..., description="Path to the file being analyzed")
    filename: str = Field(..., description="Name of the file being analyzed")

class AnalysisStep(BaseModel):
    step_name: str = Field(..., description="Name of the analysis step")
    status: str = Field(..., description="Status of the step (started, completed, failed)")
    result_data: Dict[str, Any] = Field(default_factory=dict, description="Result data from the step")
    started_at: datetime = Field(default_factory=datetime.now, description="Step start timestamp")
    completed_at: Optional[datetime] = Field(default=None, description="Step completion timestamp")
    error_message: Optional[str] = Field(default=None, description="Error message if step failed")

class AnalysisSession(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id", description="Unique session identifier")
    project_id: str = Field(..., description="ID of the project this analysis belongs to")
    user_id: str = Field(..., description="ID of the user who initiated the analysis")
    file_path: str = Field(..., description="Path to the file being analyzed")
    filename: str = Field(..., description="Name of the file being analyzed")
    status: AnalysisSessionStatus = Field(default=AnalysisSessionStatus.CREATED, description="Session status")
    steps: List[AnalysisStep] = Field(default_factory=list, description="Analysis steps and their results")
    started_at: datetime = Field(default_factory=datetime.now, description="Analysis start timestamp")
    completed_at: Optional[datetime] = Field(default=None, description="Analysis completion timestamp")
    error_message: Optional[str] = Field(default=None, description="Error message if analysis failed")

# Analysis related schemas
class VulnerabilityType(str, Enum):
    REENTRANCY = "reentrancy"
    INTEGER_OVERFLOW = "integer_overflow"
    ACCESS_CONTROL = "access_control"
    UNCHECKED_CALL = "unchecked_call"
    TIMESTAMP_DEPENDENCY = "timestamp_dependency"
    OTHER = "other"

class VulnerabilitySeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

# Streaming response schemas based on server.py logic
class StreamingNodeOutput(BaseModel):
    """Base model for streaming node outputs"""
    node: str = Field(..., description="Name of the processing node")
    output: Dict[str, Any] = Field(..., description="Output data from the node")

class ConvertToFCGOutput(BaseModel):
    """Output from convert_to_fcg node"""
    fcg_file_path: Optional[str] = Field(default=None, description="Path to the generated FCG file")
    mapping_file_path: Optional[str] = Field(default=None, description="Path to the mapping file")
    error: Optional[str] = Field(default=None, description="Error message if conversion failed")

class VulnerabilityDetectionSrcOutput(BaseModel):
    """Output from detect_vulnerability_src node"""
    predicted_class: Optional[int] = Field(default=None, description="Predicted vulnerability class (0: safe, 1: vulnerable)")
    confidence_score: Optional[float] = Field(default=None, description="Confidence score of the prediction")
    error: Optional[str] = Field(default=None, description="Error message if detection failed")

class FunctionVulnerabilityPrediction(BaseModel):
    """Individual function vulnerability prediction"""
    function_name: Optional[str] = Field(default=None, description="Name of the function")
    prediction: Optional[int] = Field(default=None, description="Vulnerability prediction (0: safe, 1: vulnerable)")
    confidence: Optional[float] = Field(default=None, description="Confidence score")

class VulnerabilityDetectionFuncOutput(BaseModel):
    """Output from detect_vulnerability_func node"""
    func_vulnerability_predictions: Optional[List[FunctionVulnerabilityPrediction]] = Field(default=None, description="Function-level vulnerability predictions")
    fcg_edges: Optional[List[List[int]]] = Field(default=None, description="FCG edges information")
    error: Optional[str] = Field(default=None, description="Error message if detection failed")

class VulnerabilityExplanation(BaseModel):
    """Vulnerability explanation for a function"""
    function_name: Optional[str] = Field(default=None, description="Name of the function")
    explanation: Optional[str] = Field(default=None, description="LLM-generated explanation of the vulnerability")

class VulnerabilityExplanationOutput(BaseModel):
    """Output from explain_vulnerability_func node"""
    explanations: Optional[List[VulnerabilityExplanation]] = Field(default=None, description="Vulnerability explanations for functions")
    error: Optional[str] = Field(default=None, description="Error message if explanation failed")

# Legacy schemas (keeping for backward compatibility)
class FileUploadRequest(BaseModel):
    filename: str = Field(..., description="Name of the uploaded file")
    content_type: str = Field(default="text/plain", description="MIME type of the file")

class VulnerabilityResult(BaseModel):
    type: VulnerabilityType = Field(..., description="Type of vulnerability detected")
    severity: VulnerabilitySeverity = Field(..., description="Severity level of the vulnerability")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score (0-1)")
    line_number: Optional[int] = Field(default=None, description="Line number where vulnerability was found")
    description: str = Field(..., description="Description of the vulnerability")
    recommendation: Optional[str] = Field(default=None, description="Recommendation to fix the vulnerability")

class GraphAnalysisResult(BaseModel):
    nodes_count: int = Field(..., description="Number of nodes in the generated graph")
    edges_count: int = Field(..., description="Number of edges in the generated graph")
    complexity_score: float = Field(..., description="Complexity score of the code")
    graph_features: Dict[str, Any] = Field(default_factory=dict, description="Additional graph features")

class AnalysisRequest(BaseModel):
    file_path: str = Field(..., description="Path to the uploaded file")
    analysis_type: str = Field(default="full", description="Type of analysis to perform")
    model_version: str = Field(default="latest", description="Version of the model to use")

class AnalysisResponse(BaseModel):
    analysis_id: str = Field(..., description="Unique identifier for this analysis")
    file_name: str = Field(..., description="Name of the analyzed file")
    file_size: int = Field(..., description="Size of the analyzed file in bytes")
    analysis_timestamp: datetime = Field(default_factory=datetime.now, description="Timestamp when analysis was performed")
    vulnerabilities: List[VulnerabilityResult] = Field(default_factory=list, description="List of detected vulnerabilities")
    graph_analysis: Optional[GraphAnalysisResult] = Field(default=None, description="Graph analysis results")
    processing_time: float = Field(..., description="Time taken to process the file in seconds")
    status: str = Field(default="completed", description="Status of the analysis")
    error_message: Optional[str] = Field(default=None, description="Error message if analysis failed")

class AnalysisStatus(BaseModel):
    analysis_id: str = Field(..., description="Unique identifier for the analysis")
    status: str = Field(..., description="Current status of the analysis")
    progress: float = Field(..., ge=0.0, le=1.0, description="Progress percentage (0-1)")
    estimated_time_remaining: Optional[float] = Field(default=None, description="Estimated time remaining in seconds")

class FileInfo(BaseModel):
    filename: str = Field(..., description="Name of the file")
    file_size: int = Field(..., description="Size of the file in bytes")
    file_type: str = Field(..., description="Type/extension of the file")
    upload_timestamp: datetime = Field(default_factory=datetime.now, description="When the file was uploaded")
    saved_path: str = Field(..., description="Path where the file is saved on the server")