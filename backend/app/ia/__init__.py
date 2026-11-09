from app.config import config
from app.ia.base import ErroIA, ProvedorIA
from app.ia.ollama import Ollama


def obter_provedor() -> ProvedorIA:
    if config.ia_provedor == "ollama":
        return Ollama()
    raise ErroIA(f"Provedor de IA desconhecido: {config.ia_provedor}")
