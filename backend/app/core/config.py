from pydantic_settings import BaseSettings
from typing import Optional, List
import secrets


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "TrustChain Supply"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8080

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./trustchain.db"
    DATABASE_URL_SYNC: str = "sqlite:///./trustchain.db"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # JWT
    JWT_SECRET: str = secrets.token_urlsafe(64)
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Blockchain
    BLOCKCHAIN_RPC_URL: str = "http://localhost:8545"
    BLOCKCHAIN_PRIVATE_KEY: str = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
    BLOCKCHAIN_CHAIN_ID: int = 31337
    CONTRACT_SUPPLY_CHAIN_REGISTRY: Optional[str] = None
    CONTRACT_BATCH_REGISTRY: Optional[str] = None
    CONTRACT_PACKAGE_IDENTITY: Optional[str] = None
    CONTRACT_SHIPMENT_CONTRACT: Optional[str] = None
    CONTRACT_ATTESTATION_REGISTRY: Optional[str] = None
    CONTRACT_FRAUD_REGISTRY: Optional[str] = None

    # IPFS / Pinata
    PINATA_API_KEY: Optional[str] = None
    PINATA_API_SECRET: Optional[str] = None
    PINATA_JWT: Optional[str] = None
    IPFS_GATEWAY_URL: str = "https://gateway.pinata.cloud/ipfs/"

    # IoT
    IOT_SIMULATOR_URL: str = "http://localhost:8001"
    IOT_SIGNING_KEY: str = "CHANGE_ME_IOT_MASTER_SIGNING_KEY"

    # Oracle
    ORACLE_SERVICE_URL: str = "http://localhost:8002"

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000"

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW: int = 60

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"


settings = Settings()
