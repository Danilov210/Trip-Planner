from kafka import KafkaProducer
import json
from shared.config import KAFKA_BOOTSTRAP_SERVERS


def get_producer():
    return KafkaProducer(
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
        value_serializer=lambda m: json.dumps(m).encode("utf-8"),
    )


def send_to_kafka(topic: str, message: dict):
    producer = get_producer()
    producer.send(topic, message)
    producer.flush()
