from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.schemas import Nivel
from app.schemas_conversas import CENARIOS


class TraducaoIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    texto: str = Field(min_length=1, max_length=1000)
    de: Literal["auto", "pt", "en"] = "auto"
    para: Literal["pt", "en"] = "en"

    @model_validator(mode="after")
    def idiomas_diferentes(self):
        if self.de == self.para:
            raise ValueError("Os idiomas de origem e de destino precisam ser diferentes")
        return self


class MensagemPublica(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    papel: Literal["user", "assistant"]
    texto: str = Field(min_length=1, max_length=1500)
    traducao: str | None = Field(default=None, max_length=1500)


class ConversaPublicaIn(BaseModel):
    mensagens: list[MensagemPublica] = Field(min_length=1, max_length=12)
    nivel: Nivel = "A2"
    cenario: str | None = None

    @field_validator("cenario")
    @classmethod
    def cenario_valido(cls, v):
        if v is not None and v not in CENARIOS:
            raise ValueError("Cenário inválido")
        return v

    @model_validator(mode="after")
    def ultima_e_do_usuario(self):
        ultima = self.mensagens[-1]
        if ultima.papel != "user":
            raise ValueError("A última mensagem precisa ser do usuário")
        if len(ultima.texto) > 500:
            raise ValueError("A mensagem pode ter no máximo 500 caracteres")
        return self


class AberturaPublicaIn(BaseModel):
    nivel: Nivel = "A2"
    cenario: str

    @field_validator("cenario")
    @classmethod
    def cenario_valido(cls, v):
        if v not in CENARIOS:
            raise ValueError("Cenário inválido")
        return v
