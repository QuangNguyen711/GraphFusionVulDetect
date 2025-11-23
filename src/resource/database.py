import os
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional
import dotenv

# Load environment variables
dotenv.load_dotenv()

logger = logging.getLogger("GraphFusionVulDetect-Database")

class DatabaseManager:
    """MongoDB database manager using Motor (async MongoDB driver)"""
    
    def __init__(self):
        self.client: Optional[AsyncIOMotorClient] = None
        self.database = None
        self.collections = {}
        
    async def connect(self):
        """Connect to MongoDB"""
        try:
            mongodb_url = os.getenv("MONGODB_URL", "mongodb://admin:password@localhost:27017/?authSource=admin")
            database_name = os.getenv("MONGODB_DATABASE", "graphfusion")
            
            self.client = AsyncIOMotorClient(mongodb_url, serverSelectionTimeoutMS=5000)
            self.database = self.client[database_name]
            
            # Test connection
            await self.client.admin.command('ismaster')
            logger.info(f"Successfully connected to MongoDB: {database_name}")
            
            # Initialize collections
            self.collections = {
                'users': self.database.users,
                'projects': self.database.projects,
                'analysis_sessions': self.database.analysis_sessions,
                'analysis_results': self.database.analysis_results,
                'file_uploads': self.database.file_uploads
            }
            
            # Create indexes
            await self._create_indexes()
            
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            raise
    
    async def disconnect(self):
        """Disconnect from MongoDB"""
        if self.client:
            self.client.close()
            logger.info("Disconnected from MongoDB")
    
    async def _create_indexes(self):
        """Create database indexes for better performance"""
        try:
            # Users collection indexes
            await self.collections['users'].create_index([("username", 1)], unique=True)
            await self.collections['users'].create_index([("email", 1)], unique=True)
            await self.collections['users'].create_index([("created_at", -1)])
            
            # Projects collection indexes
            await self.collections['projects'].create_index([("user_id", 1)])
            await self.collections['projects'].create_index([("name", 1)])
            await self.collections['projects'].create_index([("status", 1)])
            await self.collections['projects'].create_index([("created_at", -1)])
            await self.collections['projects'].create_index([("updated_at", -1)])
            
            # Analysis sessions indexes
            await self.collections['analysis_sessions'].create_index([("user_id", 1)])
            await self.collections['analysis_sessions'].create_index([("project_id", 1)])
            await self.collections['analysis_sessions'].create_index([("created_at", -1)])
            await self.collections['analysis_sessions'].create_index([("status", 1)])
            
            # Analysis results indexes
            await self.collections['analysis_results'].create_index([("session_id", 1)])
            await self.collections['analysis_results'].create_index([("created_at", -1)])
            await self.collections['analysis_results'].create_index([("file_hash", 1)])
            
            # File uploads indexes
            await self.collections['file_uploads'].create_index([("user_id", 1)])
            await self.collections['file_uploads'].create_index([("created_at", -1)])
            await self.collections['file_uploads'].create_index([("file_hash", 1)])
            
            logger.info("Database indexes created successfully")
            
        except Exception as e:
            logger.warning(f"Some indexes might already exist: {e}")
    
    def get_collection(self, collection_name: str):
        """Get a collection by name"""
        return self.collections.get(collection_name)

# Global database manager instance
db_manager = DatabaseManager()

# Convenience functions
async def get_db():
    """Get database instance"""
    if db_manager.database is None:
        await db_manager.connect()
    return db_manager.database

async def get_users_collection():
    """Get users collection"""
    if db_manager.database is None:
        await db_manager.connect()
    return db_manager.collections['users']

async def get_projects_collection():
    """Get projects collection"""
    if db_manager.database is None:
        await db_manager.connect()
    return db_manager.collections['projects']

async def get_analysis_sessions_collection():
    """Get analysis sessions collection"""
    if db_manager.database is None:
        await db_manager.connect()
    return db_manager.collections['analysis_sessions']

async def get_analysis_results_collection():
    """Get analysis results collection"""
    if db_manager.database is None:
        await db_manager.connect()
    return db_manager.collections['analysis_results']

async def get_file_uploads_collection():
    """Get file uploads collection"""
    if db_manager.database is None:
        await db_manager.connect()
    return db_manager.collections['file_uploads']
