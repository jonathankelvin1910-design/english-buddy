import httpx

from app.config import config
from app.ia.base import ErroIA, ProvedorIA


class Ollama(ProvedorIA):
    def responder_json(self, mensagens: list[dict]) -> str:
        if not config.ollama_model:
            raise ErroIA("OLLAMA_MODEL não configurado")
        try:
            r = httpx.post(
                f"{config.ollama_url}/api/chat",
                json={
                    "model": config.ollama_model,
                    "stream": False,
                    "format": "json",
                    "messages": mensagens,
                    "options": {"temperature": 0.7},
                },
                timeout=180,
            )
            r.raise_for_status()
            return r.json()["message"]["content"]
        except (httpx.HTTPError, KeyError, ValueError) as e:
            raise ErroIA("Não foi possível falar com a IA") from e
