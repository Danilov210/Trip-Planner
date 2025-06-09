import json
import psycopg2
from external_apis import fetch_plan_from_openai, get_google_route
from config import STATE_DB_URL


def process_task(message: dict):
    """
    1) Ask OpenAI for a day-by-day plan JSON
    2) (Optionally) fetch a Google Maps route
    3) Update the requests table in the state DB
    """
    print("📥 Received:", message)
    request_id = message["request_id"]
    user_id = message["user_id"]
    destination = message["start_location"]
    start_date = message["start_date"]
    end_date = message["end_date"]
    interests = message.get("interests", [])
    interests_str = ", ".join(interests) if interests else "no specific interests"

    # 1) Build and send the OpenAI prompt
    prompt = (
        f"Plan a trip to {destination} from {start_date} to {end_date} "
        f"with interests: {interests_str}. "
        "Return a JSON object with a `days` array; each day has `description`, `coords` (lat/lng), and `image_url`."
    )
    plan_text = fetch_plan_from_openai(prompt)
    print(f"📤 OpenAI response for {request_id}:\n{plan_text}")
    # 2) Parse it
    try:
        plan = json.loads(plan_text)
        print(f"📦 Parsed plan for {request_id}: {plan}")
    except json.JSONDecodeError as e:
        plan = {"error": "Invalid JSON from OpenAI", "details": str(e)}

    # 3) (Optional) get Google route for the whole trip
    try:
        route = get_google_route(destination, destination)  # or between waypoints
        plan["google_route"] = route
    except Exception:
        plan["google_route"] = None

    # 4) Persist back to the state database
    with psycopg2.connect(STATE_DB_URL) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE requests
                   SET status = %s,
                       result = %s
                 WHERE request_id = %s
                """,
                ("done", json.dumps(plan), request_id),
            )
            conn.commit()

    print(f"✅ Completed {request_id}")
