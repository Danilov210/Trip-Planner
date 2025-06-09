import os

KAFKA_TOPIC = os.getenv("KAFKA_TOPIC", "trip_requests")
STATE_DB_URL = os.getenv("STATE_DB_URL")
