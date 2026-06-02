import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Load .env file if it exists
load_dotenv()

class Settings(BaseSettings):
    # App Settings
    PROJECT_NAME: str = "Enterprise Healthcare Research Agent"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = os.getenv("JWT_SECRET", "super-secret-jwt-key-for-healthcare-research-agent-12345")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Databases
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/healthcare_research")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # OpenAI API
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    EMBEDDING_MODEL: str = "text-embedding-3-large"
    LLM_MODEL: str = "gpt-4o"

    # Pinecone Vector DB
    PINECONE_API_KEY: str = os.getenv("PINECONE_API_KEY", "")
    PINECONE_ENVIRONMENT: str = os.getenv("PINECONE_ENVIRONMENT", "")
    PINECONE_INDEX: str = os.getenv("PINECONE_INDEX", "healthcare-research-index")

    # Neo4j Graph DB
    NEO4J_URI: str = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    NEO4J_USER: str = os.getenv("NEO4J_USER", "neo4j")
    NEO4J_PASSWORD: str = os.getenv("NEO4J_PASSWORD", "neo4j_password")

    # Mock Mode Flags (Auto-enabled if credentials are missing)
    @property
    def MOCK_LLM(self) -> bool:
        return not bool(self.OPENAI_API_KEY)

    @property
    def MOCK_PINECONE(self) -> bool:
        return not bool(self.PINECONE_API_KEY)

    @property
    def MOCK_NEO4J(self) -> bool:
        return not bool(self.NEO4J_PASSWORD) or self.NEO4J_PASSWORD == "mock"

    class Config:
        case_sensitive = True

settings = Settings()
