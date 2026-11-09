from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

Nivel = Literal["A1", "A2", "B1", "B2", "C1"]
IdiomaVoz = Literal["en", "pt"]
IdiomaLegenda = Literal["en", "pt", "ambos"]


class CadastroIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    email: EmailStr
    senha: str = Field(min_length=8, max_length=72)
    nome: str = Field(min_length=1, max_length=100)

    @field_validator("senha")
    @classmethod
    def limite_bcrypt(cls, v: str) -> str:
        if len(v.encode()) > 72:
            raise ValueError("Senha muito longa")
        return v


class LoginIn(BaseModel):
    email: EmailStr
    senha: str = Field(max_length=72)


class UsuarioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    nome: str
    nivel: Nivel
    voz_idioma: IdiomaVoz
    legenda_idioma: IdiomaLegenda
    velocidade_voz: float


class TokenOut(BaseModel):
    token: str
    tipo: str = "bearer"
    usuario: UsuarioOut


class PreferenciasIn(BaseModel):
    nivel: Nivel | None = None
    voz_idioma: IdiomaVoz | None = None
    legenda_idioma: IdiomaLegenda | None = None
    velocidade_voz: float | None = Field(default=None, ge=0.5, le=1.5)
