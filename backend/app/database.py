from sqlalchemy import create_engine
from sqlalchemy.engine import URL
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import config

url = URL.create(
    "mysql+pymysql",
    username=config.db_user,
    password=config.db_password,
    host=config.db_host,
    port=config.db_port,
    database=config.db_name,
    query={"charset": "utf8mb4"},
)

engine = create_engine(url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
