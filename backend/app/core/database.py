import logging

from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings

logger = logging.getLogger(__name__)


class DatabaseManager:
    client: AsyncIOMotorClient = None
    db = None

    @classmethod
    async def connect_db(cls):
        try:
            cls.client = AsyncIOMotorClient(settings.MONGODB_URI, serverSelectionTimeoutMS=3000)
            await cls.client.admin.command("ping")
            cls.db = cls.client[settings.DB_NAME]

            # Setup indexes
            await cls.db.users.create_index("email", unique=True)
            await cls.db.tongue_analyses.create_index([("user_id", 1), ("created_at", -1)])
            logger.info("MongoDB connected: %s", settings.DB_NAME)
        except Exception as e:
            logger.warning("MongoDB unavailable (%s)", e)

    @classmethod
    async def close_db(cls):
        if cls.client:
            cls.client.close()
            logger.info("MongoDB connection closed")

    @classmethod
    def get_db(cls):
        return cls.db


db_manager = DatabaseManager()
