from fastapi import APIRouter, HTTPException, Request, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi import BackgroundTasks
from datetime import datetime, timedelta
from typing import List
from app.kafka_producer import send_to_kafka
from app.db_queries import (
    insert_request,
    clear_response,
    get_request_by_id,
    insert_user,
    get_user_by_username,
    save_trip_to_history,
    get_user_id_by_username,
    get_user_history,
    find_existing_trip,
)
from pydantic import BaseModel, Field
from shared.config import KAFKA_TOPIC
from app.config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
from jose import JWTError, jwt
import json
import uuid
import bcrypt


router = APIRouter()


class UserAuth(BaseModel):
    username: str
    password: str


class TripRequest(BaseModel):
    start_location: str
    start_date: str
    end_date: str
    interests: List[str] = Field(default_factory=list)


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        return username
    except JWTError:
        raise credentials_exception


@router.post("/submit")
async def submit_trip(trip: TripRequest, current_user: str = Depends(get_current_user)):
    request_id = str(uuid.uuid4())
    user_id = get_user_id_by_username(current_user)
    if user_id is None:
        raise HTTPException(status_code=400, detail="User not found")

    # Check for existing trip in user's history
    existing_trip = find_existing_trip(
        user_id,
        trip.start_location,
        trip.start_date,
        trip.end_date,
        trip.interests,
    )
    if existing_trip:
        # Return the existing trip immediately, do not send to Kafka
        return {
            "status": "done",
            "trip": existing_trip,
            "message": "Trip already exists in your history.",
        }

    # No existing trip, proceed as normal
    insert_request(request_id, user_id, trip.model_dump_json())

    payload = {
        "request_id": request_id,
        "user_id": user_id,
        **trip.model_dump(),
    }
    send_to_kafka(KAFKA_TOPIC, payload)
    return {
        "status": "submitted",
        "request_id": request_id,
    }


@router.get("/status/{request_id}")
async def get_status(request_id: str, background_tasks: BackgroundTasks):
    row = get_request_by_id(request_id)
    if not row:
        raise HTTPException(404)
    if row["status"] != "done":
        return {"status": row["status"]}
    result = row["result"]
    parsed = result if isinstance(result, dict) else json.loads(result)

    # Parse payload JSON string to dict
    trip_request = row["payload"]
    if isinstance(trip_request, str):
        trip_request = json.loads(trip_request)

    background_tasks.add_task(
        save_trip_to_history,
        user_id=row["user_id"],
        trip_data=trip_request,
        parsed=parsed,
    )
    background_tasks.add_task(clear_response, request_id)

    return parsed


@router.post("/signup")
async def signup(user: UserAuth):
    if user.username and user.password:
        try:
            insert_user(user.username, user.password)
            return {"status": "success", "message": f"User {user.username} registered"}
        except Exception as e:
            return {"status": "error", "message": "Invalid credentials"}
    return {"status": "error", "message": "Invalid data"}


@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    db_user = get_user_by_username(form_data.username)
    if db_user and bcrypt.checkpw(
        form_data.password.encode("utf-8"), db_user["password_hash"].encode("utf-8")
    ):
        access_token = create_access_token(data={"sub": form_data.username})
        return {
            "status": "success",
            "access_token": access_token,
            "token_type": "bearer",
            "message": f"Logged in as {form_data.username}",
        }
    return {"status": "error", "message": "Invalid credentials"}


@router.get("/history")
async def get_history(current_user: str = Depends(get_current_user)):
    user_id = get_user_id_by_username(current_user)
    if user_id is None:
        raise HTTPException(status_code=400, detail="User not found")
    history = get_user_history(user_id)
    return {"history": history}


@router.post("/find_trip")
async def find_user_trip(
    trip: TripRequest, current_user: str = Depends(get_current_user)
):
    user_id = get_user_id_by_username(current_user)
    if user_id is None:
        raise HTTPException(status_code=400, detail="User not found")
    raw_plan = find_existing_trip(
        user_id,
        trip.start_location,
        trip.start_date,
        trip.end_date,
        trip.interests,
    )
    if not raw_plan:
        raise HTTPException(status_code=404, detail="Trip not found")
    return {"raw_plan": raw_plan}


def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
