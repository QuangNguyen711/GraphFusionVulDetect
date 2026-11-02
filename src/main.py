#!/usr/bin/env python3
"""
Main entry point for the GraphFusionVulDetect API server.
This file can be used to run the API server independently.
"""

import uvicorn
import rootutils
rootutils.setup_root(__file__, indicator=".project-root", pythonpath=True)
from src.api.app import app

if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
        access_log=True,
        reload=False  # Set to True for development
    )
