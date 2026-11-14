from abc import ABC, abstractmethod


class ErroIA(Exception):
    """Falha ao obter uma resposta utilizável da IA."""


class ProvedorIA(ABC):
    @abstractmethod
    def responder_json(self, mensagens: list[dict], temperatura: float = 0.7) -> str:
        """Recebe [{'role': ..., 'content': ...}] e devolve o texto JSON bruto da IA."""
