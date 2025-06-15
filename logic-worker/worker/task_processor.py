import json
import psycopg2
import re

from external_apis import (
    fetch_plan_from_openai,
    get_google_route,
    find_place_photo_reference,
    get_google_place_photo,
    extract_landmark_name,
)
from config import STATE_DB_URL


def process_task(message: dict):
    """
    1) Ask OpenAI for a day-by-day plan JSON
    2) (Optionally) fetch a Google Maps route
    3) Enrich each day by swapping out any Wikimedia image_url
    4) Update the requests table in the state DB
    """
    print("📥 Received:", message)
    request_id = message["request_id"]
    destination = message["start_location"]
    start_date = message["start_date"]
    end_date = message["end_date"]
    interests = message.get("interests", [])
    interests_str = ", ".join(interests) if interests else "no specific interests"

    # 1) Build & send the OpenAI prompt
    prompt = (
        f"Plan a trip to {destination} from {start_date} to {end_date} "
        f"with interests: {interests_str}. "
        "Return a JSON object with a `days` array; each day has:\n"
        "  • `description`: string (what you’ll do that day),\n"
        "  • `place_name`: string (the specific location or attraction name),\n"
        "  • `coords`: { lat: number, lng: number },\n"
        "  • `image_url`: string (direct .jpg/.jpeg/.png link or empty string).\n"
        "For each `image_url`, ONLY use a direct link to a real, publicly accessible "
        "photo in .jpg, .jpeg, or .png format. Do NOT use example.com, placeholder.com, "
        "upload.wikimedia.org, or any AI-generated/fake images. "
        "Do NOT use links that do not end with .jpg, .jpeg, or .png. "
        "If you cannot find a real image, leave `image_url` as an empty string."
    )
    plan_text = fetch_plan_from_openai(prompt)
    print(f"📤 OpenAI response for {request_id}:\n{plan_text}")

    # 2) Parse
    try:
        plan = json.loads(plan_text)
        print(f"📦 Parsed plan for {request_id}: {plan}")
    except json.JSONDecodeError as e:
        plan = {"error": "Invalid JSON from OpenAI", "details": str(e)}

    # 3) Fetch a Google route between your actual waypoints (optional)
    try:
        wpts = plan.get("waypoints", [])
        if len(wpts) >= 2:
            origin = f"{wpts[0]['lat']},{wpts[0]['lng']}"
            destination = f"{wpts[-1]['lat']},{wpts[-1]['lng']}"

            # join any intermediate stops into the `waypoints` param:
            intermediate = wpts[1:-1]
            waypoints_param = (
                "|".join(f"{w['lat']},{w['lng']}" for w in intermediate)
                if intermediate
                else None
            )

            plan["google_route"] = get_google_route(
                origin, destination, waypoints=waypoints_param
            )
        else:
            plan["google_route"] = None
    except Exception as e:
        print("Failed to fetch route:", e)
        plan["google_route"] = None

    # 4) Enrich days: replace any Wikimedia URL via Google Places Photos
    for day in plan.get("days", []):
        url = day.get("image_url", "")
        # only try to replace if it's actually a Wikimedia URL
        if url.startswith("https://upload.wikimedia.org"):
            # use the explicit place_name (falls back to the trip destination)
            place_query = day.get("place_name", destination)
            print(f"🔄 Replacing Wikimedia image for landmark `{place_query}`")

            # fetch a real photo URL
            new_url = get_google_place_photo(place_query) or ""
            day["image_url"] = new_url
            print(f"   → got: {new_url}")
        else:
            # leave everything else untouched
            print(f"ℹ️  Skipping non-Wikimedia URL: {url}")

    # 5) Persist to DB
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


# def process_task(message: dict):
#     """
#     1) Ask OpenAI for a day-by-day plan JSON
#     2) (Optionally) fetch a Google Maps route
#     3) Update the requests table in the state DB
#     """
#     print("📥 Received:", message)
#     request_id = message["request_id"]
#     user_id = message["user_id"]
#     destination = message["start_location"]
#     start_date = message["start_date"]
#     end_date = message["end_date"]
#     interests = message.get("interests", [])
#     interests_str = ", ".join(interests) if interests else "no specific interests"

#     # 1) Build and send the OpenAI prompt
#     prompt = (
#         f"Plan a trip to {destination} from {start_date} to {end_date} "
#         f"with interests: {interests_str}. "
#         "Return a JSON object with a `days` array; each day has `description`, `coords` (lat/lng), and `image_url`. "
#         "For each `image_url`, ONLY use a direct link to a real, publicly accessible photo in .jpg, .jpeg, or .png format "
#         "Do NOT use example.com, placeholder.com,upload.wikimedia.org, or any AI-generated or fake images. "
#         "Do NOT use links that do not end with .jpg, .jpeg, or .png. "
#         "If you cannot find a real image, leave `image_url` as an empty string."
#     )
#     # prompt = (
#     #     f"Plan a trip to {destination} from {start_date} to {end_date} "
#     #     f"with interests: {interests_str}. "
#     #     "Return a JSON object with a `days` array; each day has `description`, `coords` (lat/lng), and `image_url`."
#     # )
#     plan_text = fetch_plan_from_openai(prompt)
#     print(f"📤 OpenAI response for {request_id}:\n{plan_text}")
#     # 2) Parse it
#     try:
#         plan = json.loads(plan_text)
#         print(f"📦 Parsed plan for {request_id}: {plan}")
#     except json.JSONDecodeError as e:
#         plan = {"error": "Invalid JSON from OpenAI", "details": str(e)}

#     # 3) (Optional) get Google route for the whole trip
#     try:
#         route = get_google_route(destination, destination)  # or between waypoints
#         plan["google_route"] = route
#     except Exception:
#         plan["google_route"] = None

#     # 4) Persist back to the state database
#     with psycopg2.connect(STATE_DB_URL) as conn:
#         with conn.cursor() as cur:
#             cur.execute(
#                 """
#                 UPDATE requests
#                    SET status = %s,
#                        result = %s
#                  WHERE request_id = %s
#                 """,
#                 ("done", json.dumps(plan), request_id),
#             )
#             conn.commit()

#     print(f"✅ Completed {request_id}")
