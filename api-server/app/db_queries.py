import psycopg2
from psycopg2.extras import RealDictCursor
from app.config import STATE_DB_URL
import bcrypt


def get_connection():
    return psycopg2.connect(STATE_DB_URL)


def get_request_by_id(request_id: str):
    """
    Fetch the status, user_id, result, and payload JSON for a given request_id from the state-db.requests table.
    Returns a dict like {'status': ..., 'user_id': ..., 'result': ..., 'payload': ...} or None if not found.
    """
    with psycopg2.connect(STATE_DB_URL) as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT status, user_id, result, payload FROM requests WHERE request_id = %s",
                (request_id,),
            )
            return cur.fetchone()  # None if no row, or {'status':..., 'result':...}


def insert_request(request_id, user_id, payload):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO requests (request_id, user_id, status, payload)
                VALUES (%s, %s, %s, %s)
            """,
                (request_id, user_id, "pending", payload),
            )


def clear_response(request_id):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM requests WHERE request_id = %s", (request_id,))


def insert_user(username, password):
    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO users (username, password_hash)
                VALUES (%s, %s)
                """,
                (username, hashed.decode("utf-8")),
            )


def get_user_by_username(username):
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM users WHERE username = %s",
                (username,),
            )
            return cur.fetchone()


def get_user_id_by_username(username):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT user_id FROM users WHERE username = %s", (username,))
            row = cur.fetchone()
            return row[0] if row else None


def save_trip_to_history(user_id, trip_data, parsed):
    # Use start_location as destination
    destination = trip_data.get("start_location")
    start_date = trip_data.get("start_date")
    end_date = trip_data.get("end_date")
    interests = trip_data.get("interests", [])
    raw_plan = parsed

    if not destination or not start_date or not end_date:
        print("Trip data missing required fields:", trip_data)
        return

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO trips (user_id, destination, start_date, end_date, interests, raw_plan)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING trip_id
                """,
                (
                    user_id,
                    destination,
                    start_date,
                    end_date,
                    psycopg2.extras.Json(interests),
                    psycopg2.extras.Json(raw_plan),
                ),
            )
            trip_id = cur.fetchone()[0]
            cur.execute(
                """
                INSERT INTO history (user_id, trip_id)
                VALUES (%s, %s)
                """,
                (user_id, trip_id),
            )
        conn.commit()


def get_user_history(user_id):
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT t.*
                FROM trips t
                JOIN history h ON t.trip_id = h.trip_id
                WHERE h.user_id = %s
                ORDER BY h.saved_at DESC
            """,
                (user_id,),
            )
            return cur.fetchall()


def find_existing_trip(user_id, start_location, start_date, end_date, interests):
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT t.raw_plan
                FROM trips t
                JOIN history h ON t.trip_id = h.trip_id
                WHERE h.user_id = %s
                  AND t.destination = %s
                  AND t.start_date = %s
                  AND t.end_date = %s
                  AND t.interests = %s
                ORDER BY h.saved_at DESC
                LIMIT 1
                """,
                (
                    user_id,
                    start_location,
                    start_date,
                    end_date,
                    psycopg2.extras.Json(interests),
                ),
            )
            row = cur.fetchone()
            return row["raw_plan"] if row else None
