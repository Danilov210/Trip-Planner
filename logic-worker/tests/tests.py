import pytest
from unittest.mock import patch
from worker.task_processor import process_task


@patch("worker.task_processor.fetch_plan_from_openai")
@patch("worker.task_processor.psycopg2.connect")
def test_process_task_success(mock_connect, mock_openai):
    mock_openai.return_value = '{"coordinates": ["Berlin", "Potsdam"], "days": []}'

    mock_conn = mock_connect.return_value.__enter__.return_value
    mock_cursor = mock_conn.cursor.return_value.__enter__.return_value

    task = {
        "request_id": "test-req-id",
        "destination": "Berlin",
        "dates": "2025-07-01 to 2025-07-05",
        "interests": "museums, nightlife",
    }

    process_task(task)

    mock_cursor.execute.assert_called_once()
    args = mock_cursor.execute.call_args[0]
    assert "UPDATE requests SET status" in args[0]
    assert "test-req-id" in args[2]
