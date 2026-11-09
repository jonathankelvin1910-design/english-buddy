import json

from app.ia import obter_provedor
from app.ia.base import ErroIA, ProvedorIA
from app.ia.prompt import montar_sistema
from app.ia.resposta import RespostaIA, interpretar

MAX_CONTEXTO = 12


def _montar_mensagens(historico: list[dict], nivel: str, cenario: str | None) -> list[dict]:
    mensagens = [{"role": "system", "content": montar_sistema(nivel, cenario)}]
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


def gerar_resposta(
    historico: list[dict],
    nivel: str = "A2",
    cenario: str | None = None,
    provedor: ProvedorIA | None = None,
) -> RespostaIA:
    """historico: [{'papel': 'user'|'assistant', 'texto': ..., 'traducao': ...}], do mais antigo ao mais novo."""
    provedor = provedor or obter_provedor()
    mensagens = _montar_mensagens(historico, nivel, cenario)
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
