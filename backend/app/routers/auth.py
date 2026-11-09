import time
from collections import defaultdict
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Usuario
from app.schemas import CadastroIn, LoginIn, PreferenciasIn, TokenOut, UsuarioOut
from app.security import HASH_FALSO, criar_token, gerar_hash, usuario_atual, verificar_senha

router = APIRouter(prefix="/auth", tags=["auth"])

JANELA_SEGUNDOS = 300
MAX_FALHAS = 5
falhas: dict[str, list[float]] = defaultdict(list)


def _chave(request: Request, email: str) -> str:
    ip = request.client.host if request.client else "?"
    return f"{ip}|{email}"


def _bloqueado(chave: str) -> bool:
    agora = time.time()
    falhas[chave] = [t for t in falhas[chave] if agora - t < JANELA_SEGUNDOS]
    return len(falhas[chave]) >= MAX_FALHAS


@router.post("/cadastro", response_model=TokenOut, status_code=201)
def cadastro(dados: CadastroIn, db: Session = Depends(get_db)):
    email = dados.email.lower()
    if db.scalar(select(Usuario).where(Usuario.email == email)):
        raise HTTPException(409, "E-mail já cadastrado")
    usuario = Usuario(email=email, senha_hash=gerar_hash(dados.senha), nome=dados.nome)
    db.add(usuario)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "E-mail já cadastrado")
    db.refresh(usuario)
    return TokenOut(token=criar_token(usuario.id), usuario=usuario)


@router.post("/login", response_model=TokenOut)
def login(dados: LoginIn, request: Request, db: Session = Depends(get_db)):
    email = dados.email.lower()
    chave = _chave(request, email)
    if _bloqueado(chave):
        raise HTTPException(429, "Muitas tentativas. Tente novamente em alguns minutos.")
    usuario = db.scalar(select(Usuario).where(Usuario.email == email))
    hash_guardado = usuario.senha_hash if usuario else HASH_FALSO
    senha_ok = verificar_senha(dados.senha, hash_guardado)
    if not usuario or not senha_ok:
        falhas[chave].append(time.time())
        raise HTTPException(401, "E-mail ou senha incorretos")
    falhas.pop(chave, None)
    return TokenOut(token=criar_token(usuario.id), usuario=usuario)


@router.get("/eu", response_model=UsuarioOut)
def eu(usuario: Usuario = Depends(usuario_atual)):
    return usuario


@router.patch("/preferencias", response_model=UsuarioOut)
def preferencias(
    dados: PreferenciasIn,
    usuario: Usuario = Depends(usuario_atual),
    db: Session = Depends(get_db),
):
    for campo, valor in dados.model_dump(exclude_unset=True).items():
        if valor is None:
            continue
        if campo == "velocidade_voz":
            valor = Decimal(str(valor))
        setattr(usuario, campo, valor)
    db.commit()
    db.refresh(usuario)
    return usuario
