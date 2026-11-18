from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class VocabularioIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    en: str = Field(min_length=1, max_length=200)
    pt: str = Field(min_length=1, max_length=200)


class RevisaoIn(BaseModel):
    sabia: bool


class VocabularioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    en: str
    pt: str
    caixa: int
    proxima_revisao: date
    acertos: int
    erros: int
    vencida: bool = False
