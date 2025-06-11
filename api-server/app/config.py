import os

KAFKA_TOPIC = os.getenv("KAFKA_TOPIC", "trip_requests")
STATE_DB_URL = os.getenv("STATE_DB_URL")

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS512")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRATION_MINUTES", 60))
