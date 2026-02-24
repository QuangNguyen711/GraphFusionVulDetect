import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .router import create_router
from src.infrastructure.database import db_manager
from src.services.model_loader import load_all_models
from src.services.graph_loader import build_global_graph

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("SmartContractScanner")

def create_app():
    app = FastAPI(
        title="Smart Contract Vulnerability Scanner API",
        version="1.1.0",
        description="API for Smart Contract Vulnerability Detection using GNN + LLM",
        docs_url="/docs",
        redoc_url="/redoc"
    )

    # ---- CORS ----
    origins = [
        "http://localhost",
        "http://localhost:8080",
        "http://localhost:3000",
        "http://127.0.0.1",
        "http://127.0.0.1:5500",
        "http://127.0.0.1:8080",
        "http://127.0.0.1:3000",
        "null"
    ]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ---- Startup event ----
    async def startup_event():
        logger.info("Connecting to DB...")
        await db_manager.connect()

        logger.info("Loading all ML/LLM models...")
        await load_all_models()

        logger.info("Building graph workflow...")
        build_global_graph()

        logger.info("System initialized successfully.")

    async def shutdown_event():
        logger.info("Disconnecting DB...")
        await db_manager.disconnect()

    app.add_event_handler("startup", startup_event)
    app.add_event_handler("shutdown", shutdown_event)

    # ---- Routers ----
    app.include_router(create_router())

    @app.get("/")
    async def root():
        return {
            "message": "Smart Contract Vulnerability Scanner API",
            "status": "running"
        }

    return app

app = create_app()
