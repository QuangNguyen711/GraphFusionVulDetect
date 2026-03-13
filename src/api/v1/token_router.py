from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from src.services.token_service import TokenService
# Assuming project_service is available to create projects
# from src.services.project_service import project_service 
import logging

router = APIRouter(prefix="/token", tags=["token"])
logger = logging.getLogger("TokenRouter")
token_service = TokenService() #Or instantiate properly if singleton

class TokenSearchQuery(BaseModel):
    query: str

class TokenSearchResult(BaseModel):
    id: str
    name: str
    symbol: str
    thumb: Optional[str] = None

class TokenAnalyzeRequest(BaseModel):
    chain: str
    address: str
    name: str

@router.get("/search", response_model=List[TokenSearchResult])
def search_tokens(query: str):
    """
    Search for tokens by name or symbol.
    """
    try:
        results = token_service.search_token(query)
        # Transform to response model
        return [
            TokenSearchResult(
                id=c.get("id"),
                name=c.get("name"),
                symbol=c.get("symbol"),
                thumb=c.get("thumb") or c.get("large") 
            ) for c in results
        ]
    except Exception as e:
        logger.error(f"Search failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/platforms/{coin_id}")
def get_token_platforms(coin_id: str):
    """
    Get supported platforms/addresses for a token.
    """
    try:
        details = token_service.get_token_details(coin_id)
        return details.get("platforms", {})
    except Exception as e:
        logger.error(f"Get details failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze")
async def analyze_token(request: TokenAnalyzeRequest):
    """
    Fetch source code for a token and return it for the frontend to process/create project.
    """
    try:
        # Fetch source code in a non-blocking way
        import asyncio
        loop = asyncio.get_event_loop()
        
        contract_data = await loop.run_in_executor(
            None, 
            token_service.fetch_source_code, 
            request.address, 
            request.chain
        )
        
        source_code = contract_data.get("source_code")
        if not source_code:
            raise HTTPException(status_code=404, detail="Source code not found or not verified.")

        return {
            "source_code": source_code,
            "contract_name": contract_data.get("name"),
            "file_name": f"{request.address}.sol",
            "abi": contract_data.get("abi")
        }

    except Exception as e:
        logger.error(f"Analysis setup failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
