from kafka_consumer import get_consumer_with_retry
from task_processor import process_task


def run():
    print("👷 TripPlannerService worker started, waiting for messages...")
    consumer = get_consumer_with_retry()
    for msg in consumer:
        payload = msg.value
        print(f"📥 Consumed message: {payload}")
        try:
            process_task(payload)
            print(f"✅ Completed processing: {payload['request_id']}")
        except Exception as e:
            print(f"❌ Processing error for {payload.get('request_id')}: {e}")


if __name__ == "__main__":
    run()
