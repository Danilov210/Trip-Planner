from kafka import KafkaConsumer, errors
import time
import json
from config import KAFKA_TOPIC, KAFKA_BOOTSTRAP_SERVERS


def get_consumer_with_retry(retries=5, delay=5):
    for attempt in range(retries):
        try:
            return KafkaConsumer(
                KAFKA_TOPIC,
                bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
                value_deserializer=lambda m: json.loads(m.decode("utf-8")),
                auto_offset_reset="earliest",
                group_id="trip_worker_group",
            )
        except errors.NoBrokersAvailable:
            print(
                f"[Kafka] No brokers available, retrying... ({attempt + 1}/{retries})"
            )
            time.sleep(delay)
    raise RuntimeError("Kafka is not available after retries")


# Use this in main.py
