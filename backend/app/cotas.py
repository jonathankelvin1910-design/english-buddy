"""Limite diário de uso da IA: por usuário (se estiver logado) ou por IP (visitante).

Fica em memória: zera quando o servidor reinicia. Com vários processos ou máquinas, cada um conta o seu;
nesse caso o ideal é guardar os contadores no banco ou no Redis.
"""

import threading
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import jwt
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import config

_bearer = HTTPBearer(auto_error=False)
MAX_CHAVES = 100_000  # evita crescer sem parar se alguém variar muito o IP


def _fuso():
    try:
        return ZoneInfo(config.fuso)
    except ZoneInfoNotFoundError:
        return timezone(timedelta(hours=-3))


def _hoje() -> date:
    return datetime.now(_fuso()).date()


class CotaDiaria:
    """Conta usos por chave dentro do dia (no fuso configurado). Vira o dia, zera tudo."""

    def __init__(self):
        self._dia: date | None = None
        self._usos: dict[str, int] = {}
        self._trava = threading.Lock()

    def _virar(self) -> None:
        hoje = _hoje()
        if self._dia != hoje:
            self._dia = hoje
            self._usos.clear()

    def usados(self, chave: str) -> int:
        with self._trava:
            self._virar()
            return self._usos.get(chave, 0)

    def consumir(self, chave: str, maximo: int) -> bool:
        """Gasta 1 uso. Devolve False (sem gastar) se o limite do dia já foi atingido."""
        with self._trava:
            self._virar()
            usados = self._usos.get(chave, 0)
            if usados >= maximo:
                return False
            if chave not in self._usos and len(self._usos) >= MAX_CHAVES:
                return False
            self._usos[chave] = usados + 1
            return True

    def devolver(self, chave: str) -> None:
        with self._trava:
            self._virar()
            if self._usos.get(chave, 0) > 0:
                self._usos[chave] -= 1

    def zerar(self) -> None:
        with self._trava:
            self._dia = None
            self._usos.clear()


cota_chat = CotaDiaria()  # Conversar, Fluente e aberturas de cenário
cota_traducao = CotaDiaria()


@dataclass(frozen=True)
class Identidade:
    chave: str
    logado: bool
    max_chat: int


def para_usuario(usuario) -> Identidade:
    return Identidade(f"u:{usuario.id}", True, config.limite_dia_usuario)


def identidade(request: Request, cred: HTTPAuthorizationCredentials | None = Depends(_bearer)) -> Identidade:
    """Quem está usando: o usuário do token, se houver um válido; senão, o IP (visitante). Nunca dá 401."""
    if cred is not None:
        try:
            dados = jwt.decode(cred.credentials, config.jwt_secret, algorithms=["HS256"])
            return Identidade(f"u:{int(dados['sub'])}", True, config.limite_dia_usuario)
        except (jwt.PyJWTError, KeyError, ValueError):
            pass
    ip = request.client.host if request.client else "?"
    return Identidade(f"ip:{ip}", False, config.limite_dia_visitante)


def _msg_limite(ident: Identidade) -> str:
    if ident.logado:
        return f"Você atingiu o limite de {ident.max_chat} mensagens de hoje. Volte amanhã para continuar praticando."
    return (
        f"Você atingiu o limite de {ident.max_chat} mensagens de hoje. "
        f"Crie uma conta grátis para ter {config.limite_dia_usuario} por dia, ou volte amanhã."
    )


@contextmanager
def gasto_chat(ident: Identidade):
    """Gasta 1 mensagem do dia. Se a IA falhar, devolve, para o erro não custar a cota de quem não foi atendido."""
    if not cota_chat.consumir(ident.chave, ident.max_chat):
        raise HTTPException(429, _msg_limite(ident))
    try:
        yield
    except BaseException:
        cota_chat.devolver(ident.chave)
        raise


@contextmanager
def gasto_traducao(ident: Identidade):
    if not cota_traducao.consumir(ident.chave, config.limite_dia_traducao):
        raise HTTPException(
            429,
            f"Você atingiu o limite de {config.limite_dia_traducao} traduções de hoje. Volte amanhã.",
        )
    try:
        yield
    except BaseException:
        cota_traducao.devolver(ident.chave)
        raise


def resumo(ident: Identidade) -> dict:
    usados = cota_chat.usados(ident.chave)
    return {
        "limite": ident.max_chat,
        "restante": max(ident.max_chat - usados, 0),
        "logado": ident.logado,
    }
