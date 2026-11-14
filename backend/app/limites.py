import threading
import time
from collections import defaultdict, deque
from contextlib import contextmanager

from fastapi import HTTPException


class LimitePorJanela:
    """Permite no máximo `maximo` chamadas por chave (ex.: IP) dentro de `janela` segundos."""

    def __init__(self, maximo: int, janela: int):
        self.maximo = maximo
        self.janela = janela
        self._acessos: dict[str, deque] = defaultdict(deque)
        self._trava = threading.Lock()

    def verificar(self, chave: str) -> None:
        agora = time.monotonic()
        with self._trava:
            fila = self._acessos[chave]
            while fila and agora - fila[0] >= self.janela:
                fila.popleft()
            if len(fila) >= self.maximo:
                espera = int(self.janela - (agora - fila[0])) + 1
                raise HTTPException(
                    429,
                    f"Muitas requisições. Tente novamente em {espera} segundos.",
                    headers={"Retry-After": str(espera)},
                )
            fila.append(agora)
            if len(self._acessos) > 5000:
                self._limpar(agora)

    def _limpar(self, agora: float) -> None:
        for chave in [c for c, f in self._acessos.items() if not f or agora - f[-1] >= self.janela]:
            del self._acessos[chave]


# Quantas chamadas à IA podem acontecer ao mesmo tempo (as demais esperam na fila)
VAGAS_IA = 2
ESPERA_MAXIMA = 20  # segundos
_vagas = threading.BoundedSemaphore(VAGAS_IA)


@contextmanager
def vaga_ia(espera: float | None = None):
    tempo = ESPERA_MAXIMA if espera is None else espera
    if not _vagas.acquire(timeout=tempo):
        raise HTTPException(503, "Muita gente conversando agora. Tente de novo em instantes.")
    try:
        yield
    finally:
        _vagas.release()
