-- English Buddy: banco de dados
CREATE DATABASE IF NOT EXISTS english_buddy CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE english_buddy;

-- Quem usa o site, com as preferências de voz e legenda
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  nome VARCHAR(80) NOT NULL,
  nivel ENUM('A1','A2','B1','B2','C1') NOT NULL DEFAULT 'A2',
  voz_idioma ENUM('en','pt') NOT NULL DEFAULT 'en',
  legenda_idioma ENUM('en','pt','ambos') NOT NULL DEFAULT 'ambos',
  velocidade_voz DECIMAL(3,2) NOT NULL DEFAULT 1.00,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Cada conversa pertence a um usuário
CREATE TABLE IF NOT EXISTS conversas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  titulo VARCHAR(120) NOT NULL DEFAULT 'Nova conversa',
  cenario VARCHAR(40) NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_conversas_usuario (usuario_id, atualizado_em)
);

-- Mensagens da conversa: o que o usuário disse e o que a IA respondeu
CREATE TABLE IF NOT EXISTS mensagens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  conversa_id INT NOT NULL,
  papel ENUM('user','assistant') NOT NULL,
  texto TEXT NOT NULL,
  traducao TEXT NULL,
  correcao TEXT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversa_id) REFERENCES conversas(id) ON DELETE CASCADE,
  INDEX idx_mensagens_conversa (conversa_id, id)
);

-- Frases curtas (em inglês e português) que aparecem nos cartões no meio da tela
CREATE TABLE IF NOT EXISTS frases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mensagem_id INT NOT NULL,
  ordem TINYINT NOT NULL,
  en VARCHAR(200) NOT NULL,
  pt VARCHAR(200) NOT NULL,
  FOREIGN KEY (mensagem_id) REFERENCES mensagens(id) ON DELETE CASCADE,
  UNIQUE KEY uq_frase_ordem (mensagem_id, ordem)
);

-- Vocabulário do aluno (repetição espaçada)
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
