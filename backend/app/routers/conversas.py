import json

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.cotas import gasto_chat, para_usuario
from app.database import get_db
from app.ia.base import ErroIA
from app.ia.servico import gerar_abertura, gerar_resposta
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
        with gasto_chat(para_usuario(usuario)):
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


# Mesmo formato da mensagem do assistente que já é devolvida em POST /mensagens
MensagemOut = TrocaOut.model_fields["assistente"].annotation


@router.post("/conversas/{conversa_id}/abertura", response_model=MensagemOut, status_code=201)
def abrir(conversa_id: int, usuario: Usuario = Depends(usuario_atual), db: Session = Depends(get_db)):
    """O Buddy puxa assunto: só em conversa de cenário que ainda não tem mensagens."""
    conversa = _conversa_do_usuario(db, conversa_id, usuario)
    if not conversa.cenario:
        raise HTTPException(400, "Só conversas de cenário têm abertura")
    ja_tem = db.scalar(select(func.count(Mensagem.id)).where(Mensagem.conversa_id == conversa.id))
    if ja_tem:
        raise HTTPException(409, "A conversa já começou")

    try:
        with gasto_chat(para_usuario(usuario)):
            resposta = gerar_abertura(usuario.nivel, conversa.cenario)
    except ErroIA:
        raise HTTPException(502, "A IA não respondeu agora. Tente de novo.")

    msg = Mensagem(conversa_id=conversa.id, papel="assistant", texto=resposta.en, traducao=resposta.pt)
    msg.frases = [Frase(ordem=i, en=f.en, pt=f.pt) for i, f in enumerate(resposta.frases)]
    db.add(msg)
    conversa.atualizado_em = func.now()
    db.commit()
    db.refresh(msg)
    return msg
