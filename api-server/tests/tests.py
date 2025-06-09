import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_submit_and_status():
    # 1) submit a fake trip
    resp = client.post(
        "/submit",
        json={
            "destination": "Tel Aviv",
            "dates": "2025-07-01 to 2025-07-07",
            "interests": "hiking, food",
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "request_id" in body

    rid = body["request_id"]

    # 2) Immediately check status: should be "pending"
    status_resp = client.get(f"/status/{rid}")
    assert status_resp.status_code == 200
    status_body = status_resp.json()
    assert status_body["status"] in [
        "pending",
        "complete",
    ]  # POC might still be pending


# import pytest
# from fastapi.testclient import TestClient
# from app.main import app

# client = TestClient(app)


# def test_submit_trip():
#     response = client.post(
#         "/submit",
#         json={
#             "user_id": "test-user",
#             "destination": "Berlin",
#             "dates": "2025-07-01 to 2025-07-05",
#             "interests": "history, food, art",
#         },
#     )
#     assert response.status_code == 200
#     assert "request_id" in response.json()


# def test_status_not_found():
#     response = client.get("/status/nonexistent-id")
#     assert response.status_code == 404
#     assert response.json()["detail"] == "Request ID not found"
