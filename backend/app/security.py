from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.config import config
from app.database import get_db
from app.models import Usuario

esquema = HTTPBearer(auto_error=False)

# Hash descartável: usado quando o e-mail não existe, para o login levar o mesmo tempo
HASH_FALSO = bcrypt.hashpw(b"x", bcrypt.gensalt()).decode()


def gerar_hash(senha: str) -> str:
    return bcrypt.hashpw(senha.encode(), bcrypt.gensalt()).decode()


def verificar_senha(senha: str, hash_guardado: str) -> bool:
    try:
        return bcrypt.checkpw(senha.encode(), hash_guardado.encode())
    except ValueError:
        return False


def criar_token(usuario_id: int) -> str:
    expira = datetime.now(timezone.utc) + timedelta(minutes=config.jwt_expira_minutos)
    return jwt.encode({"sub": str(usuario_id), "exp": expira}, config.jwt_secret, algorithm="HS256")


def usuario_atual(
    cred: HTTPAuthorizationCredentials | None = Depends(esquema),
    db: Session = Depends(get_db),
) -> Usuario:
    erro = HTTPException(401, "Não autenticado", headers={"WWW-Authenticate": "Bearer"})
    if cred is None:
        raise erro
    try:
        dados = jwt.decode(cred.credentials, config.jwt_secret, algorithms=["HS256"])
        usuario_id = int(dados["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise erro
    usuario = db.get(Usuario, usuario_id)
    if usuario is None:
        raise erro
    return usuario
