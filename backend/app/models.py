from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Numeric, String, Text, FetchedValue, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True)
    senha_hash: Mapped[str] = mapped_column(String(255))
    nome: Mapped[str] = mapped_column(String(100))
    nivel: Mapped[str] = mapped_column(Enum("A1", "A2", "B1", "B2", "C1"), default="A2")
    voz_idioma: Mapped[str] = mapped_column(Enum("en", "pt"), default="en")
    legenda_idioma: Mapped[str] = mapped_column(Enum("en", "pt", "ambos"), default="ambos")
    velocidade_voz: Mapped[Decimal] = mapped_column(Numeric(3, 2), default=Decimal("1.00"))
    criado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    conversas: Mapped[list["Conversa"]] = relationship(back_populates="usuario", cascade="all, delete-orphan")


class Conversa(Base):
    __tablename__ = "conversas"

    id: Mapped[int] = mapped_column(primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"))
    titulo: Mapped[str] = mapped_column(String(150), default="Nova conversa")
    cenario: Mapped[str | None] = mapped_column(String(100), default=None)
    criado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    atualizado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), server_onupdate=FetchedValue())

    usuario: Mapped["Usuario"] = relationship(back_populates="conversas")
    mensagens: Mapped[list["Mensagem"]] = relationship(
        back_populates="conversa", cascade="all, delete-orphan", order_by="Mensagem.id"
    )


class Mensagem(Base):
    __tablename__ = "mensagens"

    id: Mapped[int] = mapped_column(primary_key=True)
    conversa_id: Mapped[int] = mapped_column(ForeignKey("conversas.id", ondelete="CASCADE"))
    papel: Mapped[str] = mapped_column(Enum("user", "assistant"))
    texto: Mapped[str] = mapped_column(Text)
    traducao: Mapped[str | None] = mapped_column(Text, default=None)
    correcao: Mapped[str | None] = mapped_column(Text, default=None)
    criado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    conversa: Mapped["Conversa"] = relationship(back_populates="mensagens")
    frases: Mapped[list["Frase"]] = relationship(
        back_populates="mensagem", cascade="all, delete-orphan", order_by="Frase.ordem"
    )


class Frase(Base):
    __tablename__ = "frases"

    id: Mapped[int] = mapped_column(primary_key=True)
    mensagem_id: Mapped[int] = mapped_column(ForeignKey("mensagens.id", ondelete="CASCADE"))
    ordem: Mapped[int]
    en: Mapped[str] = mapped_column(String(200))
    pt: Mapped[str] = mapped_column(String(200))

    mensagem: Mapped["Mensagem"] = relationship(back_populates="frases")


class Vocabulario(Base):
    """Frase salva pelo aluno para revisar com repetição espaçada (caixas de Leitner, 1 a 5)."""

    __tablename__ = "vocabulario"
    __table_args__ = (UniqueConstraint("usuario_id", "en", name="uq_vocabulario_usuario_en"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"))
    en: Mapped[str] = mapped_column(String(200))
    pt: Mapped[str] = mapped_column(String(200))
    caixa: Mapped[int] = mapped_column(default=1)
    proxima_revisao: Mapped[date] = mapped_column(Date)
    acertos: Mapped[int] = mapped_column(default=0)
    erros: Mapped[int] = mapped_column(default=0)
    criado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

