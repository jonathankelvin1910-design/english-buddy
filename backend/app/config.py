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


config = Config()
