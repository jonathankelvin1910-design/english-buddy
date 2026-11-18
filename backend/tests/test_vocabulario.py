import os
import sys
import types
from datetime import date, timedelta

os.environ.update(DB_USER="x", DB_PASSWORD="x", DB_NAME="x", JWT_SECRET="x")

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

try:
    from app.security import usuario_atual
except ImportError:  # ambiente de teste sem o módulo de segurança
    modulo = types.ModuleType("app.security")
    modulo.usuario_atual = lambda: None
    sys.modules["app.security"] = modulo
    from app.security import usuario_atual

from app.database import Base, get_db
from app.models import Usuario
from app.routers import vocabulario

HOJE = date(2026, 11, 15)


class DataFixa(date):
    @classmethod
    def today(cls):
        return HOJE


@pytest.fixture
def ctx(monkeypatch):
    monkeypatch.setattr(vocabulario, "date", DataFixa)
    motor = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(motor)
    Sessao = sessionmaker(bind=motor, autoflush=False)
    with Sessao() as s:
        s.add_all([
            Usuario(email="a@a.com", senha_hash="x", nome="Ana"),
            Usuario(email="b@b.com", senha_hash="x", nome="Bia"),
        ])
        s.commit()

    app = FastAPI()
    app.include_router(vocabulario.router)
    atual = {"id": 1}

    def get_db_teste():
        with Sessao() as s:
            yield s

    def usuario_teste():
        with Sessao() as s:
            return s.get(Usuario, atual["id"])

    app.dependency_overrides[get_db] = get_db_teste
    app.dependency_overrides[usuario_atual] = usuario_teste
    cliente = TestClient(app)
    cliente.como = lambda i: atual.update(id=i)
    return cliente


@pytest.mark.parametrize("caixa,sabia,esperado_caixa,dias", [
    (1, True, 2, 3), (2, True, 3, 7), (3, True, 4, 14), (4, True, 5, 30), (5, True, 5, 30),
    (1, False, 1, 1), (3, False, 1, 1), (5, False, 1, 1),
])
def test_calcular_proxima(caixa, sabia, esperado_caixa, dias):
    assert vocabulario.calcular_proxima(caixa, sabia, HOJE) == (esperado_caixa, HOJE + timedelta(days=dias))


def test_salvar_e_listar(ctx):
    r = ctx.post("/vocabulario", json={"en": "  Where is the bathroom?  ", "pt": "Onde fica o banheiro?"})
    assert r.status_code == 201
    j = r.json()
    assert j["en"] == "Where is the bathroom?" and j["caixa"] == 1 and j["vencida"] is True
    assert j["proxima_revisao"] == "2026-11-15"
    assert len(ctx.get("/vocabulario").json()) == 1


def test_salvar_repetida_nao_duplica(ctx):
    a = ctx.post("/vocabulario", json={"en": "Good morning", "pt": "Bom dia"})
    b = ctx.post("/vocabulario", json={"en": "good MORNING", "pt": "Bom dia!"})
    assert a.status_code == 201 and b.status_code == 200
    assert b.json()["id"] == a.json()["id"]
    assert len(ctx.get("/vocabulario").json()) == 1


@pytest.mark.parametrize("corpo", [
    {"en": "", "pt": "x"}, {"en": "x", "pt": "  "}, {"en": "a" * 201, "pt": "x"}, {"en": "x"},
])
def test_salvar_validacao(ctx, corpo):
    assert ctx.post("/vocabulario", json=corpo).status_code == 422


def test_limite_de_frases(ctx, monkeypatch):
    monkeypatch.setattr(vocabulario, "MAX_FRASES", 2)
    for i in range(2):
        assert ctx.post("/vocabulario", json={"en": f"phrase {i}", "pt": "x"}).status_code == 201
    r = ctx.post("/vocabulario", json={"en": "phrase 3", "pt": "x"})
    assert r.status_code == 400
    assert ctx.post("/vocabulario", json={"en": "phrase 0", "pt": "x"}).status_code == 200  # repetida ainda vale


def test_revisar_acerto_e_erro(ctx):
    i = ctx.post("/vocabulario", json={"en": "Thank you", "pt": "Obrigado"}).json()["id"]
    r = ctx.post(f"/vocabulario/{i}/revisar", json={"sabia": True}).json()
    assert r["caixa"] == 2 and r["proxima_revisao"] == "2026-11-18" and r["acertos"] == 1 and r["vencida"] is False
    assert ctx.get("/vocabulario/revisao").json() == []
    r = ctx.post(f"/vocabulario/{i}/revisar", json={"sabia": False}).json()
    assert r["caixa"] == 1 and r["proxima_revisao"] == "2026-11-16" and r["erros"] == 1


def test_revisao_traz_so_vencidas(ctx, monkeypatch):
    a = ctx.post("/vocabulario", json={"en": "one", "pt": "um"}).json()["id"]
    ctx.post("/vocabulario", json={"en": "two", "pt": "dois"})
    ctx.post(f"/vocabulario/{a}/revisar", json={"sabia": True})
    assert [x["en"] for x in ctx.get("/vocabulario/revisao").json()] == ["two"]
    monkeypatch.setattr(vocabulario, "date", type("D", (DataFixa,), {"today": classmethod(lambda c: HOJE + timedelta(days=3))}))
    assert len(ctx.get("/vocabulario/revisao").json()) == 2


def test_apagar(ctx):
    i = ctx.post("/vocabulario", json={"en": "Bye", "pt": "Tchau"}).json()["id"]
    assert ctx.delete(f"/vocabulario/{i}").status_code == 204
    assert ctx.get("/vocabulario").json() == []
    assert ctx.delete(f"/vocabulario/{i}").status_code == 404


def test_isolamento_entre_usuarios(ctx):
    i = ctx.post("/vocabulario", json={"en": "Secret", "pt": "Segredo"}).json()["id"]
    ctx.como(2)
    assert ctx.get("/vocabulario").json() == []
    assert ctx.delete(f"/vocabulario/{i}").status_code == 404
    assert ctx.post(f"/vocabulario/{i}/revisar", json={"sabia": True}).status_code == 404
    # a outra pessoa pode salvar a mesma frase sem conflito
    assert ctx.post("/vocabulario", json={"en": "Secret", "pt": "Segredo"}).status_code == 201
    ctx.como(1)
    assert len(ctx.get("/vocabulario").json()) == 1
