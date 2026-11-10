import json

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.ia.base import ErroIA
from app.ia.servico import gerar_resposta
from app.models import Conversa, Frase, Mensagem, Usuario
from app.schemas_conversas import (
    CENARIOS,
    ConversaDetalhe,
    ConversaIn,
    ConversaResumo,
    MensagemIn,
    TrocaOut,
)
from app.security import usuario_atual

router = APIRouter(tags=["conversas"])

TITULO_PADRAO = "Nova conversa"


def _conversa_do_usuario(db: Session, conversa_id: int, usuario: Usuario) -> Conversa:
    conversa = db.scalar(
        select(Conversa).where(Conversa.id == conversa_id, Conversa.usuario_id == usuario.id)
    )
    if conversa is None:
        raise HTTPException(404, "Conversa não encontrada")
    return conversa


@router.get("/cenarios")
def cenarios():
    return list(CENARIOS)


@router.get("/conversas", response_model=list[ConversaResumo])
def listar(usuario: Usuario = Depends(usuario_atual), db: Session = Depends(get_db)):
    return db.scalars(
        select(Conversa)
        .where(Conversa.usuario_id == usuario.id)
        .order_by(Conversa.atualizado_em.desc(), Conversa.id.desc())
    ).all()


@router.post("/conversas", response_model=ConversaResumo, status_code=201)
def criar(dados: ConversaIn, usuario: Usuario = Depends(usuario_atual), db: Session = Depends(get_db)):
    conversa = Conversa(usuario_id=usuario.id, cenario=dados.cenario)
    if dados.cenario:
        conversa.titulo = dados.cenario
    db.add(conversa)
    db.commit()
    db.refresh(conversa)
    return conversa


@router.get("/conversas/{conversa_id}", response_model=ConversaDetalhe)
def detalhe(conversa_id: int, usuario: Usuario = Depends(usuario_atual), db: Session = Depends(get_db)):
    conversa = db.scalar(
        select(Conversa)
        .where(Conversa.id == conversa_id, Conversa.usuario_id == usuario.id)
        .options(selectinload(Conversa.mensagens).selectinload(Mensagem.frases))
    )
    if conversa is None:
        raise HTTPException(404, "Conversa não encontrada")
    return conversa


@router.delete("/conversas/{conversa_id}", status_code=204)
def apagar(conversa_id: int, usuario: Usuario = Depends(usuario_atual), db: Session = Depends(get_db)):
    conversa = _conversa_do_usuario(db, conversa_id, usuario)
    db.delete(conversa)
    db.commit()
    return Response(status_code=204)


@router.post("/conversas/{conversa_id}/mensagens", response_model=TrocaOut, status_code=201)
def enviar(
    conversa_id: int,
    dados: MensagemIn,
    usuario: Usuario = Depends(usuario_atual),
    db: Session = Depends(get_db),
):
    conversa = _conversa_do_usuario(db, conversa_id, usuario)

    recentes = db.scalars(
        select(Mensagem).where(Mensagem.conversa_id == conversa.id).order_by(Mensagem.id.desc()).limit(11)
    ).all()
    historico = [{"papel": m.papel, "texto": m.texto, "traducao": m.traducao} for m in reversed(recentes)]
    historico.append({"papel": "user", "texto": dados.texto, "traducao": None})

    # Chama a IA antes de salvar: se falhar, nada fica gravado
    try:
        resposta = gerar_resposta(historico, usuario.nivel, conversa.cenario)
    except ErroIA:
        raise HTTPException(502, "A IA não respondeu agora. Tente de novo.")

    correcao = None
    if resposta.correcao:
        correcao = json.dumps(resposta.correcao.model_dump(), ensure_ascii=False)

    msg_usuario = Mensagem(conversa_id=conversa.id, papel="user", texto=dados.texto, correcao=correcao)
    db.add(msg_usuario)
    db.flush()

    msg_ia = Mensagem(conversa_id=conversa.id, papel="assistant", texto=resposta.en, traducao=resposta.pt)
    msg_ia.frases = [Frase(ordem=i, en=f.en, pt=f.pt) for i, f in enumerate(resposta.frases)]
    db.add(msg_ia)

    if conversa.titulo == TITULO_PADRAO:
        conversa.titulo = dados.texto[:40]
    conversa.atualizado_em = func.now()

    db.commit()
    db.refresh(msg_usuario)
    db.refresh(msg_ia)
    return {"usuario": msg_usuario, "assistente": msg_ia}
