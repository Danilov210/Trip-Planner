from fastapi import APIRouter, HTTPException, Request
from typing import List
from app.kafka_producer import send_to_kafka
from app.db_queries import (
    insert_request,
    clear_response,
    get_request_by_id,
)
from pydantic import BaseModel, Field
from shared.config import KAFKA_TOPIC
import json
import uuid

router = APIRouter()


class TripRequest(BaseModel):
    start_location: str
    start_date: str
    end_date: str
    interests: List[str] = Field(default_factory=list)


@router.post("/submit")
async def submit_trip(trip: TripRequest):
    request_id = str(uuid.uuid4())
    user_id = "guest"

    insert_request(request_id, user_id, trip.model_dump_json())

    payload = {
        "request_id": request_id,
        "user_id": user_id,
        **trip.model_dump(),
    }
    send_to_kafka(KAFKA_TOPIC, payload)
    return {"status": "submitted"}


@router.get("/status/{request_id}")
async def get_status(request_id: str):
    row = get_request_by_id(request_id)
    if not row:
        raise HTTPException(404)
    if row["status"] != "done":
        return {"status": row["status"]}
    result = row["result"]
    parsed = result if isinstance(result, dict) else json.loads(result)
    clear_response(request_id)
    return parsed
