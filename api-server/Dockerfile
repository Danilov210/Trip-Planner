FROM python:3.11-slim

WORKDIR /app

COPY api-server/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY api-server/app /app/app
COPY shared /app/shared

ENV PYTHONPATH=/app:/app/shared

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
