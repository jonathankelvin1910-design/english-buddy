import json
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

CENARIOS = (
    "Job interview",
    "Ordering at a restaurant",
    "Airport and travel",
    "Meeting a new friend",
    "At the doctor",
    "Shopping for clothes",
)


class ConversaIn(BaseModel):
    cenario: str | None = None

    @field_validator("cenario")
    @classmethod
    def cenario_valido(cls, v):
        if v is not None and v not in CENARIOS:
            raise ValueError("Cenário inválido")
        return v


class MensagemIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    texto: str = Field(min_length=1, max_length=500)


class FraseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    en: str
    pt: str


class CorrecaoOut(BaseModel):
    original: str
    corrigida: str
    explicacao: str


class MensagemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    papel: str
    texto: str
    traducao: str | None
    correcao: CorrecaoOut | None
    frases: list[FraseOut]
    criado_em: datetime

    @field_validator("correcao", mode="before")
    @classmethod
    def ler_correcao(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except ValueError:
                return None
        return v


class ConversaResumo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    titulo: str
    cenario: str | None
    atualizado_em: datetime


class ConversaDetalhe(ConversaResumo):
    mensagens: list[MensagemOut]


class TrocaOut(BaseModel):
    usuario: MensagemOut
    assistente: MensagemOut
