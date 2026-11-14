from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.routers import auth, conversas, publico

app = FastAPI(title="English Buddy")
app.include_router(auth.router)
app.include_router(conversas.router)
app.include_router(publico.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/saude")
def saude(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "ok", "banco": "conectado"}
