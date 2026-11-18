import json

from app.ia import obter_provedor
from app.ia.base import ErroIA, ProvedorIA
from app.ia.prompt import montar_sistema, montar_sistema_fluente
from app.ia.resposta import RespostaIA, interpretar

MAX_CONTEXTO = 12


def _montar_mensagens(
    historico: list[dict], nivel: str, cenario: str | None, sistema: str | None = None
) -> list[dict]:
    mensagens = [{"role": "system", "content": sistema or montar_sistema(nivel, cenario)}]
    for m in historico[-MAX_CONTEXTO:]:
        if m["papel"] == "assistant":
            corpo = {"en": m["texto"]}
            if m.get("traducao"):
                corpo["pt"] = m["traducao"]
            conteudo = json.dumps(corpo, ensure_ascii=False)
        else:
            conteudo = m["texto"]
        mensagens.append({"role": m["papel"], "content": conteudo})
    return mensagens


def _chamar(provedor: ProvedorIA, mensagens: list[dict]) -> RespostaIA:
    for _ in range(2):
        bruto = provedor.responder_json(mensagens)
        try:
            return interpretar(bruto)
        except ValueError:
            mensagens = mensagens + [
                {"role": "assistant", "content": bruto},
                {"role": "user", "content": "That was not valid. Reply again ONLY with the JSON object described in the instructions."},
            ]
    raise ErroIA("A IA devolveu uma resposta inválida")


def gerar_resposta(
    historico: list[dict],
    nivel: str = "A2",
    cenario: str | None = None,
    provedor: ProvedorIA | None = None,
) -> RespostaIA:
    """historico: [{'papel': 'user'|'assistant', 'texto': ..., 'traducao': ...}], do mais antigo ao mais novo."""
    provedor = provedor or obter_provedor()
    return _chamar(provedor, _montar_mensagens(historico, nivel, cenario))


def gerar_abertura(
    nivel: str,
    cenario: str,
    provedor: ProvedorIA | None = None,
) -> RespostaIA:
    """Primeira fala do Buddy num cenário, antes de o aluno escrever qualquer coisa."""
    provedor = provedor or obter_provedor()
    mensagens = [
        {"role": "system", "content": montar_sistema(nivel, cenario, abertura=True)},
        {"role": "user", "content": "(The learner has just joined. Begin the scene now.)"},
    ]
    resposta = _chamar(provedor, mensagens)
    resposta.correcao = None  # não há nada a corrigir ainda
    return resposta


def gerar_resposta_fluente(historico: list[dict], provedor: ProvedorIA | None = None) -> RespostaIA:
    """Bate-papo por voz: só a fala em inglês e a legenda em português, sem correção nem frases."""
    provedor = provedor or obter_provedor()
    resposta = _chamar(provedor, _montar_mensagens(historico, "C1", None, sistema=montar_sistema_fluente()))
    resposta.correcao = None
    resposta.frases = []
    return resposta

