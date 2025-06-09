import os

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")

STATE_DB_URL = os.getenv("STATE_DB_URL")
APP_DB_URL = os.getenv("APP_DB_URL")

KAFKA_TOPIC = os.getenv("KAFKA_TOPIC", "trip_requests")
KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")
