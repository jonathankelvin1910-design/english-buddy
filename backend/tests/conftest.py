import os

os.environ.setdefault("DB_USER", "x")
os.environ.setdefault("DB_PASSWORD", "x")
os.environ.setdefault("DB_NAME", "x")
os.environ.setdefault("JWT_SECRET", "x")

import pytest


@pytest.fixture(autouse=True)
def zerar_cotas():
    """Cada teste começa com o dia zerado e sem traduções guardadas."""
    from app import cotas
    from app.routers import publico

    cotas.cota_chat.zerar()
    cotas.cota_traducao.zerar()
    publico._cache_traducao.clear()
    yield
