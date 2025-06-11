from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import router

app = FastAPI()

# === ADD THIS CORS BLOCK ===
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # or ["*"] to allow any origin
    allow_credentials=True,
    allow_methods=["*"],  # allow GET, POST, OPTIONS, etc
    allow_headers=["*"],  # allow all headers (Content-Type, Authorization…)
)
# ============================

app.include_router(router)
