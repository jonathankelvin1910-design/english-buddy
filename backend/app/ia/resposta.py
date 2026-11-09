import json

from pydantic import BaseModel, Field, ValidationError, field_validator


class FraseIA(BaseModel):
    en: str = Field(min_length=1, max_length=200)
    pt: str = Field(min_length=1, max_length=200)


class CorrecaoIA(BaseModel):
    original: str = Field(min_length=1, max_length=500)
    corrigida: str = Field(min_length=1, max_length=500)
    explicacao: str = Field(min_length=1, max_length=500)


class RespostaIA(BaseModel):
    en: str = Field(min_length=1, max_length=1500)
    pt: str = Field(min_length=1, max_length=1500)
    frases: list[FraseIA] = []
    correcao: CorrecaoIA | None = None

    @field_validator("frases", mode="before")
    @classmethod
    def frases_validas(cls, v):
        if not isinstance(v, list):
            return []
        boas = []
        for item in v:
            try:
                boas.append(FraseIA.model_validate(item))
            except ValidationError:
                continue
        return boas[:3]

    @field_validator("correcao", mode="before")
    @classmethod
    def correcao_valida(cls, v):
        if v is None:
            return None
        try:
            return CorrecaoIA.model_validate(v)
        except ValidationError:
            return None


def interpretar(bruto: str) -> RespostaIA:
    """Converte o texto da IA em RespostaIA. Levanta ValueError se estiver fora do contrato."""
    inicio, fim = bruto.find("{"), bruto.rfind("}")
    if inicio == -1 or fim <= inicio:
        raise ValueError("sem JSON")
    dados = json.loads(bruto[inicio : fim + 1])
    if not isinstance(dados, dict):
        raise ValueError("JSON não é um objeto")
    return RespostaIA.model_validate(dados)
