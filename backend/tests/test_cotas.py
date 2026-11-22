import json
from datetime import datetime, timedelta, timezone

import jwt
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app import cotas, limites
from app.config import config
from app.ia.base import ErroIA, ProvedorIA
from app.routers import publico

app = FastAPI()
app.include_router(publico.router)
cliente = TestClient(app)


class Falso(ProvedorIA):
    def __init__(self, respostas):
        self.respostas = list(respostas)

    def responder_json(self, mensagens, temperatura=0.7):
        r = self.respostas.pop(0) if len(self.respostas) > 1 else self.respostas[0]
        if isinstance(r, Exception):
            raise r
        return r


TRAD = json.dumps({"idioma_origem": "pt", "traducao": "Hello"})
CHAT = json.dumps({"entendi": True, "correcao": None, "en": "Hi! How are you?", "pt": "Oi! Como vai?", "frases": []})
FLU = json.dumps({"en": "Hi! How are you?", "pt": "Oi! Como vai?"})


@pytest.fixture(autouse=True)
def tudo_liberado_por_minuto(monkeypatch):
    for nome in ("limite_traducao", "limite_conversa", "limite_fluente"):
        monkeypatch.setattr(publico, nome, limites.LimitePorJanela(1000, 60))


def usar(monkeypatch, *respostas):
    f = Falso(respostas)
    monkeypatch.setattr("app.ia.traducao.obter_provedor", lambda: f)
    monkeypatch.setattr("app.ia.servico.obter_provedor", lambda: f)


def token(uid, expirado=False):
    exp = datetime.now(timezone.utc) + timedelta(minutes=-5 if expirado else 60)
    return jwt.encode({"sub": str(uid), "exp": exp}, config.jwt_secret, algorithm="HS256")


def auth(uid):
    return {"Authorization": f"Bearer {token(uid)}"}


FLUENTE = {"mensagens": [{"papel": "user", "texto": "Hello!"}]}


def test_visitante_tem_limite_diario(monkeypatch):
    monkeypatch.setattr(config, "limite_dia_visitante", 3)
    usar(monkeypatch, FLU)
    for _ in range(3):
        assert cliente.post("/publico/fluente", json=FLUENTE).status_code == 200
    r = cliente.post("/publico/fluente", json=FLUENTE)
    assert r.status_code == 429
    assert "limite de 3 mensagens" in r.json()["detail"] and "Crie uma conta" in r.json()["detail"]


def test_cota_e_compartilhada_entre_fluente_e_conversar(monkeypatch):
    monkeypatch.setattr(config, "limite_dia_visitante", 2)
    usar(monkeypatch, FLU)
    assert cliente.post("/publico/fluente", json=FLUENTE).status_code == 200
    usar(monkeypatch, CHAT)
    assert cliente.post("/publico/conversar", json={"mensagens": [{"papel": "user", "texto": "Hi"}], "nivel": "A1"}).status_code == 200
    assert cliente.post("/publico/abertura", json={"nivel": "A1", "cenario": "Ordering at a restaurant"}).status_code == 429


def test_usuario_logado_tem_limite_proprio_e_maior(monkeypatch):
    monkeypatch.setattr(config, "limite_dia_visitante", 1)
    monkeypatch.setattr(config, "limite_dia_usuario", 3)
    usar(monkeypatch, FLU)
    for _ in range(3):
        assert cliente.post("/publico/fluente", json=FLUENTE, headers=auth(7)).status_code == 200
    r = cliente.post("/publico/fluente", json=FLUENTE, headers=auth(7))
    assert r.status_code == 429 and "Volte amanhã" in r.json()["detail"] and "Crie uma conta" not in r.json()["detail"]
    # outro usuário e o visitante têm contagens separadas
    assert cliente.post("/publico/fluente", json=FLUENTE, headers=auth(8)).status_code == 200
    assert cliente.post("/publico/fluente", json=FLUENTE).status_code == 200


def test_token_invalido_vira_visitante(monkeypatch):
    monkeypatch.setattr(config, "limite_dia_visitante", 1)
    monkeypatch.setattr(config, "limite_dia_usuario", 50)
    usar(monkeypatch, FLU)
    ruim = {"Authorization": "Bearer lixo"}
    exp = {"Authorization": f"Bearer {token(1, expirado=True)}"}
    assert cliente.post("/publico/fluente", json=FLUENTE, headers=ruim).status_code == 200
    assert cliente.post("/publico/fluente", json=FLUENTE, headers=exp).status_code == 429  # mesmo IP, visitante


def test_erro_da_ia_devolve_a_mensagem(monkeypatch):
    monkeypatch.setattr(config, "limite_dia_visitante", 1)
    usar(monkeypatch, ErroIA("caiu"))
    assert cliente.post("/publico/fluente", json=FLUENTE).status_code == 502
    usar(monkeypatch, FLU)
    assert cliente.post("/publico/fluente", json=FLUENTE).status_code == 200  # a cota não foi gasta pelo erro


def test_cota_endpoint_mostra_o_que_resta(monkeypatch):
    monkeypatch.setattr(config, "limite_dia_visitante", 5)
    usar(monkeypatch, FLU)
    assert cliente.get("/publico/cota").json() == {"limite": 5, "restante": 5, "logado": False}
    cliente.post("/publico/fluente", json=FLUENTE)
    cliente.post("/publico/fluente", json=FLUENTE)
    assert cliente.get("/publico/cota").json()["restante"] == 3
    monkeypatch.setattr(config, "limite_dia_usuario", 100)
    assert cliente.get("/publico/cota", headers=auth(3)).json() == {"limite": 100, "restante": 100, "logado": True}


def test_traducao_tem_limite_diario(monkeypatch):
    monkeypatch.setattr(config, "limite_dia_traducao", 2)
    usar(monkeypatch, TRAD)
    corpo = lambda t: {"texto": t, "de": "auto", "para": "en"}
    assert cliente.post("/publico/traduzir", json=corpo("um")).status_code == 200
    assert cliente.post("/publico/traduzir", json=corpo("dois")).status_code == 200
    r = cliente.post("/publico/traduzir", json=corpo("três"))
    assert r.status_code == 429 and "traduções" in r.json()["detail"]


def test_traducao_repetida_vem_do_cache_e_nao_gasta_cota(monkeypatch):
    monkeypatch.setattr(config, "limite_dia_traducao", 1)
    usar(monkeypatch, TRAD)
    corpo = {"texto": "olá", "de": "auto", "para": "en"}
    for _ in range(5):
        assert cliente.post("/publico/traduzir", json=corpo).status_code == 200
    assert cotas.cota_traducao.usados("ip:testclient") == 1


def test_traducao_nao_conta_nem_gasta_cota_de_conversa(monkeypatch):
    monkeypatch.setattr(config, "limite_dia_visitante", 1)
    usar(monkeypatch, TRAD)
    for t in ("a", "b", "c"):
        assert cliente.post("/publico/traduzir", json={"texto": t, "de": "auto", "para": "en"}).status_code == 200
    assert cliente.get("/publico/cota").json()["restante"] == 1


def test_o_dia_vira_a_meia_noite_do_fuso(monkeypatch):
    monkeypatch.setattr(config, "limite_dia_visitante", 1)
    usar(monkeypatch, FLU)
    assert cliente.post("/publico/fluente", json=FLUENTE).status_code == 200
    assert cliente.post("/publico/fluente", json=FLUENTE).status_code == 429
    amanha = cotas._hoje() + timedelta(days=1)
    monkeypatch.setattr(cotas, "_hoje", lambda: amanha)
    assert cliente.post("/publico/fluente", json=FLUENTE).status_code == 200
