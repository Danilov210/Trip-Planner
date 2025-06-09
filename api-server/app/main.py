from fastapi import FastAPI
from app.routes import router
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

app = FastAPI(title="Trip Planner API", version="0.1.0")

app.include_router(router)
