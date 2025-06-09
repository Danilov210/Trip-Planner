FROM python:3.11-slim

WORKDIR /worker

COPY logic-worker/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY logic-worker/worker   .  
COPY shared              /worker/shared
ENV PYTHONPATH=/worker:/worker/shared

CMD ["python", "-u", "main.py"]