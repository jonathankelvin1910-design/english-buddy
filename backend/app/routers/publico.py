from collections import OrderedDict

from fastapi import APIRouter, Depends, HTTPException, Request

from app.ia.base import ErroIA
from app.ia.resposta import RespostaIA
from app.ia.servico import gerar_abertura, gerar_resposta, gerar_resposta_fluente
from app.ia.traducao import TraducaoIA, traduzir_texto
from app.cotas import Identidade, gasto_chat, gasto_traducao, identidade, resumo
from app.limites import LimitePorJanela, vaga_ia
from app.schemas_publico import AberturaPublicaIn, ConversaFluenteIn, ConversaPublicaIn, TraducaoIn

router = APIRouter(prefix="/publico", tags=["publico"])

# Por IP. Atrás de um proxy, o IP real precisa ser configurado no servidor (não confiamos em cabeçalhos do cliente)
limite_traducao = LimitePorJanela(maximo=40, janela=60)  # a tradução automática faz várias chamadas
limite_conversa = LimitePorJanela(maximo=10, janela=60)
limite_fluente = LimitePorJanela(maximo=20, janela=60)  # conversa por voz tem muitos turnos curtos

ERRO_IA = "A IA não respondeu agora. Tente de novo."

# Traduções já feitas: repetir o mesmo texto não gasta IA nem a cota do dia
_CACHE_MAX = 500
_cache_traducao: OrderedDict = OrderedDict()


def _ip(request: Request) -> str:
    return request.client.host if request.client else "?"


@router.get("/cota")
def cota(ident: Identidade = Depends(identidade)):
    """Quantas mensagens de conversa ainda restam hoje para quem está usando."""
    return resumo(ident)


@router.post("/traduzir", response_model=TraducaoIA)
def traduzir(dados: TraducaoIn, request: Request, ident: Identidade = Depends(identidade)):
    limite_traducao.verificar(_ip(request))
    chave = (dados.texto, dados.de, dados.para)
    guardada = _cache_traducao.get(chave)
    if guardada is not None:
        return guardada
    try:
        with gasto_traducao(ident), vaga_ia():
            resultado = traduzir_texto(dados.texto, dados.de, dados.para)
    except ErroIA:
        raise HTTPException(502, ERRO_IA)
    _cache_traducao[chave] = resultado
    if len(_cache_traducao) > _CACHE_MAX:
        _cache_traducao.popitem(last=False)
    return resultado


@router.post("/conversar", response_model=RespostaIA)
def conversar(dados: ConversaPublicaIn, request: Request, ident: Identidade = Depends(identidade)):
    limite_conversa.verificar(_ip(request))
    historico = [
        {"papel": m.papel, "texto": m.texto, "traducao": m.traducao} for m in dados.mensagens
    ]
    try:
        with gasto_chat(ident), vaga_ia():
            return gerar_resposta(historico, dados.nivel, dados.cenario)
    except ErroIA:
        raise HTTPException(502, ERRO_IA)


@router.post("/abertura", response_model=RespostaIA)
def abertura(dados: AberturaPublicaIn, request: Request, ident: Identidade = Depends(identidade)):
    limite_conversa.verificar(_ip(request))
    try:
        with gasto_chat(ident), vaga_ia():
            return gerar_abertura(dados.nivel, dados.cenario)
    except ErroIA:
        raise HTTPException(502, ERRO_IA)


@router.post("/fluente", response_model=RespostaIA)
def fluente(dados: ConversaFluenteIn, request: Request, ident: Identidade = Depends(identidade)):
    limite_fluente.verificar(_ip(request))
    historico = [
        {"papel": m.papel, "texto": m.texto, "traducao": m.traducao} for m in dados.mensagens
    ]
    try:
        with gasto_chat(ident), vaga_ia():
            return gerar_resposta_fluente(historico)
    except ErroIA:
        raise HTTPException(502, ERRO_IA)

