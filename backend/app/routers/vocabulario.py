from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Usuario, Vocabulario
from app.schemas_vocabulario import RevisaoIn, VocabularioIn, VocabularioOut
from app.security import usuario_atual

router = APIRouter(prefix="/vocabulario", tags=["vocabulario"])

MAX_FRASES = 500
MAX_REVISAO = 30  # frases por sessão de revisão

# Dias até a próxima revisão em cada caixa (método Leitner)
INTERVALOS = {1: 1, 2: 3, 3: 7, 4: 14, 5: 30}
CAIXA_MAX = 5


def calcular_proxima(caixa: int, sabia: bool, hoje: date) -> tuple[int, date]:
    """Acertou: sobe de caixa e espera mais. Errou: volta para a caixa 1 e reaparece amanhã."""
    nova = min(caixa + 1, CAIXA_MAX) if sabia else 1
    return nova, hoje + timedelta(days=INTERVALOS[nova])


def _saida(v: Vocabulario, hoje: date) -> VocabularioOut:
    saida = VocabularioOut.model_validate(v)
    saida.vencida = v.proxima_revisao <= hoje
    return saida


def _da_pessoa(db: Session, item_id: int, usuario: Usuario) -> Vocabulario:
    item = db.scalar(select(Vocabulario).where(Vocabulario.id == item_id, Vocabulario.usuario_id == usuario.id))
    if item is None:
        raise HTTPException(404, "Frase não encontrada")
    return item


@router.get("", response_model=list[VocabularioOut])
def listar(usuario: Usuario = Depends(usuario_atual), db: Session = Depends(get_db)):
    hoje = date.today()
    itens = db.scalars(
        select(Vocabulario)
        .where(Vocabulario.usuario_id == usuario.id)
        .order_by(Vocabulario.proxima_revisao, Vocabulario.id)
    ).all()
    return [_saida(v, hoje) for v in itens]


@router.get("/revisao", response_model=list[VocabularioOut])
def revisao(usuario: Usuario = Depends(usuario_atual), db: Session = Depends(get_db)):
    hoje = date.today()
    itens = db.scalars(
        select(Vocabulario)
        .where(Vocabulario.usuario_id == usuario.id, Vocabulario.proxima_revisao <= hoje)
        .order_by(Vocabulario.proxima_revisao, Vocabulario.id)
        .limit(MAX_REVISAO)
    ).all()
    return [_saida(v, hoje) for v in itens]


@router.post("", response_model=VocabularioOut, status_code=201)
def salvar(
    dados: VocabularioIn,
    resposta: Response,
    usuario: Usuario = Depends(usuario_atual),
    db: Session = Depends(get_db),
):
    hoje = date.today()

    def existente():
        return db.scalar(
            select(Vocabulario).where(
                Vocabulario.usuario_id == usuario.id, func.lower(Vocabulario.en) == dados.en.lower()
            )
        )

    # Salvar de novo a mesma frase não duplica: devolve a que já existe
    if (item := existente()) is not None:
        resposta.status_code = 200
        return _saida(item, hoje)

    total = db.scalar(select(func.count(Vocabulario.id)).where(Vocabulario.usuario_id == usuario.id))
    if total >= MAX_FRASES:
        raise HTTPException(400, f"Você já tem {MAX_FRASES} frases salvas. Apague algumas para salvar novas.")

    item = Vocabulario(usuario_id=usuario.id, en=dados.en, pt=dados.pt, caixa=1, proxima_revisao=hoje)
    db.add(item)
    try:
        db.commit()
    except IntegrityError:  # duas requisições ao mesmo tempo
        db.rollback()
        resposta.status_code = 200
        return _saida(existente(), hoje)
    db.refresh(item)
    return _saida(item, hoje)


@router.post("/{item_id}/revisar", response_model=VocabularioOut)
def revisar(
    item_id: int,
    dados: RevisaoIn,
    usuario: Usuario = Depends(usuario_atual),
    db: Session = Depends(get_db),
):
    item = _da_pessoa(db, item_id, usuario)
    hoje = date.today()
    item.caixa, item.proxima_revisao = calcular_proxima(item.caixa, dados.sabia, hoje)
    if dados.sabia:
        item.acertos += 1
    else:
        item.erros += 1
    db.commit()
    db.refresh(item)
    return _saida(item, hoje)


@router.delete("/{item_id}", status_code=204)
def apagar(item_id: int, usuario: Usuario = Depends(usuario_atual), db: Session = Depends(get_db)):
    db.delete(_da_pessoa(db, item_id, usuario))
    db.commit()
    return Response(status_code=204)
