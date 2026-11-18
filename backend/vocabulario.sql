-- Vocabulário do aluno (repetição espaçada). Rode uma vez: mysql -u root english_buddy < vocabulario.sql
CREATE TABLE IF NOT EXISTS vocabulario (
  id INT NOT NULL AUTO_INCREMENT,
  usuario_id INT NOT NULL,
  en VARCHAR(200) NOT NULL,
  pt VARCHAR(200) NOT NULL,
  caixa INT NOT NULL DEFAULT 1,
  proxima_revisao DATE NOT NULL,
  acertos INT NOT NULL DEFAULT 0,
  erros INT NOT NULL DEFAULT 0,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_vocabulario_usuario_en (usuario_id, en),
  KEY ix_vocabulario_revisao (usuario_id, proxima_revisao),
  CONSTRAINT fk_vocabulario_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
