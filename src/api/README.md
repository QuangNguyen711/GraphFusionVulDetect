# GraphFusionVulDetect API

API for Smart Contract Vulnerability Detection using Graph Neural Networks and Large Language Models.

## Overview

This API provides endpoints for analyzing Solidity smart contracts to detect vulnerabilities using a combination of Graph Neural Networks (GNNs) and Large Language Models (LLMs).

## Features

- **Real-time Streaming Analysis**: Get analysis results as they are processed
- **Graph-based Vulnerability Detection**: Uses GNN models for source-level and function-level vulnerability detection
- **LLM-powered Explanations**: Provides detailed explanations of detected vulnerabilities
- **RESTful API**: Standard HTTP endpoints with comprehensive documentation

## API Structure

```
src/api/
├── app.py                 # Main FastAPI application with model loading
├── router.py             # API route configuration
├── main.py               # Entry point for running the API
├── schema/               # Pydantic models for request/response
│   ├── entity.py         # Entity models and streaming schemas
│   └── response.py       # Standard response schemas
├── services/             # Business logic layer
│   └── analysis_service.py  # Vulnerability analysis service
└── v1/                   # API version 1 endpoints
    └── analyze.py        # Analysis endpoints
```

## Key Differences from server.py

The new API structure provides several improvements over the original `server.py`:

1. **Modular Architecture**: Separated concerns into services, schemas, and routes
2. **Better Error Handling**: Comprehensive validation and error responses
3. **Service Layer**: Business logic is abstracted into reusable services
4. **Type Safety**: Full Pydantic model validation
5. **Documentation**: Auto-generated OpenAPI/Swagger documentation
6. **Health Checks**: Endpoints to verify API and model status

## Endpoints

### POST `/api/v1/analyze`

Upload and analyze a Solidity smart contract file.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: Solidity file (.sol)

**Response:**
- Content-Type: `application/x-ndjson`
- Streaming response with analysis progress

**Example Response Stream:**
```json
{"node": "convert_to_fcg", "output": {"fcg_file_path": "/tmp/contract.fcg", "mapping_file_path": "/tmp/mapping.json"}}
{"node": "detect_vulnerability_src", "output": {"predicted_class": 1, "confidence_score": 0.85}}
{"node": "detect_vulnerability_func", "output": {"func_vulnerability_predictions": [{"function_name": "transfer", "prediction": 1, "confidence": 0.9}]}}
{"node": "explain_vulnerability_func", "output": {"explanations": [{"function_name": "transfer", "explanation": "This function is vulnerable to reentrancy attacks..."}]}}
```

### GET `/api/v1/health`

Check the health status of the analysis service.

**Response:**
```json
{
  "status": "ready",
  "message": "Analysis service is ready to process requests"
}
```

### GET `/health`

Check the overall health of the API.

**Response:**
```json
{
  "status": "healthy",
  "models_loaded": true,
  "device": "cuda"
}
```

## Running the API

### Option 1: Using the API module directly
```bash
python -m src.api.main
```

### Option 2: Using uvicorn directly
```bash
uvicorn src.api.app:app --host 0.0.0.0 --port 8000
```

### Option 3: Using the existing server.py (legacy)
```bash
python server.py
```

## Environment Variables

Make sure to set these environment variables:

```bash
EMBEDDING_MODEL_PATH=path/to/roberta/model
GRAPH_VUL_MODEL_PATH=path/to/graph/model
NODE_VUL_MODEL_PATH=path/to/node/model
MODEL_NAME=your_llm_model_name
BASE_URL=your_llm_base_url
GEMINI_API_KEY=your_api_key
```

## Model Loading

The API automatically loads the following models on startup:

1. **RoBERTa Model**: For code embedding (`embedd_model`)
2. **Graph Classifier**: For source-level vulnerability detection (`graph_vul_model`)
3. **Node Classifier**: For function-level vulnerability detection (`node_vul_model`)
4. **LLM**: For vulnerability explanations (`llm`)

## CORS Configuration

The API is configured to accept requests from:
- `http://localhost`
- `http://localhost:8080`
- `http://127.0.0.1`
- `http://127.0.0.1:5500`
- `null` (for direct file access)

## Error Handling

The API provides comprehensive error handling:

- **File Validation**: Checks file type, size, and content
- **Model Errors**: Graceful handling of model loading and inference errors
- **Streaming Errors**: Error messages are included in the stream
- **HTTP Errors**: Standard HTTP status codes with detailed messages

## Development

For development, you can enable auto-reload:

```python
# In src/api/main.py
uvicorn.run(
    app,
    host="0.0.0.0", 
    port=8000,
    reload=True  # Enable auto-reload for development
)
```

## Documentation

When the API is running, you can access:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **OpenAPI JSON**: `http://localhost:8000/openapi.json`
