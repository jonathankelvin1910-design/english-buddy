from pydantic_settings import BaseSettings, SettingsConfigDict


class Config(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    db_host: str = "localhost"
    db_port: int = 3306
    db_user: str
    db_password: str
    db_name: str

    jwt_secret: str
    jwt_expira_minutos: int = 1440

    ollama_url: str = "http://127.0.0.1:11434"
    ollama_model: str = ""
    ia_provedor: str = "ollama"

    # Limites diários de uso da IA (o dia vira à meia-noite no fuso abaixo)
    fuso: str = "America/Maceio"
    limite_dia_traducao: int = 300  # por usuário ou IP
    limite_dia_visitante: int = 30  # mensagens de Conversar + Fluente, por IP
    limite_dia_usuario: int = 100  # mensagens de Conversar + Fluente, por conta


config = Config()
