import os
import json
from openai import OpenAI
import requests

# initialize a single OpenAI client
_openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def fetch_plan_from_openai(prompt: str) -> str:
    system = (
        "You are an expert trip‐planner.  "
        "Given the user’s request, *return exactly one JSON object* "
        "with these fields:\n"
        "  • days: an array of day‐objects, each with a text summary and coordinates\n"
        "  • waypoints: an array of {lat, lng} for the trip path\n\n"
        "Do not include any markdown, commentary, or extra keys—only the JSON."
    )
    resp = _openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
        temperature=0.7,
    )
    return resp.choices[0].message.content


def get_google_route(start: str, end: str) -> dict:
    """
    Fetch a driving route between `start` and `end` from Google Maps Directions API.
    Expects GOOGLE_MAPS_API_KEY in env.
    """
    key = os.getenv("GOOGLE_MAPS_API_KEY")
    url = "https://maps.googleapis.com/maps/api/directions/json"
    params = {"origin": start, "destination": end, "key": key}
    r = requests.get(url, params=params)
    r.raise_for_status()
    return r.json()
