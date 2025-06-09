import psycopg2
from psycopg2.extras import RealDictCursor
from app.config import STATE_DB_URL


def get_connection():
    return psycopg2.connect(STATE_DB_URL)


def get_request_by_id(request_id: str):
    """
    Fetch the status and result JSON for a given request_id from the state-db.requests table.
    Returns a dict like {'status': 'done', 'result': '<big JSON string>'} or None if not found.
    """
    with psycopg2.connect(STATE_DB_URL) as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT status, result FROM requests WHERE request_id = %s",
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
