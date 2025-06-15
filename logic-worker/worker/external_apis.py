import os
import json
import re
import urllib.parse
from openai import OpenAI
import requests
from typing import Optional

# initialize a single OpenAI client
_openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
GOOGLE_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")


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


def find_place_photo_reference(place_name: str) -> str | None:
    """
    Uses Google Places Text Search to look up a place by name and return its first photo_reference.
    """
    GOOGLE_KEY = os.getenv("GOOGLE_MAPS_API_KEY")
    url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
    params = {"query": place_name, "key": GOOGLE_KEY}
    resp = requests.get(url, params=params)
    resp.raise_for_status()
    data = resp.json()
    if data.get("results") and data["results"][0].get("photos"):
        return data["results"][0]["photos"][0]["photo_reference"]
    return None


def get_google_place_photo(query: str, max_width: int = 800) -> str | None:
    """
    1) Text‐search the place by name.
    2) Grab the first photo_reference.
    3) Call the Place Photo endpoint (no redirect).
    4) Return the Location header (actual image URL).
    """
    # 1) Find the place via Text Search
    ts_url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
    ts_params = {"query": query, "key": GOOGLE_API_KEY}
    ts_res = requests.get(ts_url, params=ts_params)
    ts_res.raise_for_status()
    ts_data = ts_res.json()
    if ts_data.get("status") != "OK" or not ts_data.get("results"):
        print(f"Places TextSearch failed: {ts_data.get('status')}")
        return None

    photos = ts_data["results"][0].get("photos")
    if not photos:
        print("No photos found in TextSearch result")
        return None

    photo_ref = photos[0]["photo_reference"]

    # 2) Fetch the actual image URL via the Place Photo endpoint
    photo_url = "https://maps.googleapis.com/maps/api/place/photo"
    photo_params = {
        "photoreference": photo_ref,
        "maxwidth": max_width,
        "key": GOOGLE_API_KEY,
    }
    # IMPORTANT: don't auto‐follow the redirect; we want the Location header
    photo_res = requests.get(photo_url, params=photo_params, allow_redirects=False)
    if photo_res.status_code in (301, 302):
        return photo_res.headers.get("Location")
    else:
        print(
            "Unexpected status from Photo endpoint:",
            photo_res.status_code,
            photo_res.text,
        )
        return None


def extract_landmark_name(image_url: str) -> str:
    """
    Given an image URL like:
      "https://…/Brandenburg_Gate_in_Berlin_%28cropped%29.jpg"
      "https://…/Marienplatz_Munich_1.jpg"
    Returns:
      "Brandenburg_Gate_in_Berlin"
      "Marienplatz_Munich"
    """
    # 1) Decode any %-escapes
    decoded = urllib.parse.unquote(image_url)
    # 2) Grab the filename
    filename = os.path.basename(decoded)
    # 3) Strip extension
    base, _ext = os.path.splitext(filename)
    # 4) Remove trailing "_(…)” or "_<digits>"
    #    e.g. "_(cropped)" or "_1"
    cleaned = re.sub(r"_(?:\(.+\)|\d+)$", "", base)
    return cleaned
