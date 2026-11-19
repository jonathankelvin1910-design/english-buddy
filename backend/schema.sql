-- English Buddy: esquema do banco (MySQL 8+ / MariaDB 10.5+)
-- Uso: mysql -u root -p < backend/schema.sql

CREATE DATABASE IF NOT EXISTS english_buddy CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE english_buddy;

CREATE TABLE IF NOT EXISTS usuarios (
	id INTEGER NOT NULL AUTO_INCREMENT,
	email VARCHAR(255) NOT NULL,
	senha_hash VARCHAR(255) NOT NULL,
	nome VARCHAR(100) NOT NULL,
	nivel ENUM('A1','A2','B1','B2','C1') NOT NULL,
	voz_idioma ENUM('en','pt') NOT NULL,
	legenda_idioma ENUM('en','pt','ambos') NOT NULL,
	velocidade_voz NUMERIC(3, 2) NOT NULL,
	criado_em DATETIME NOT NULL DEFAULT (now()),
	PRIMARY KEY (id),
	UNIQUE (email)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS conversas (
	id INTEGER NOT NULL AUTO_INCREMENT,
	usuario_id INTEGER NOT NULL,
	titulo VARCHAR(150) NOT NULL,
	cenario VARCHAR(100),
	criado_em DATETIME NOT NULL DEFAULT (now()),
	atualizado_em DATETIME NOT NULL DEFAULT (now()),
	PRIMARY KEY (id),
	FOREIGN KEY(usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vocabulario (
	id INTEGER NOT NULL AUTO_INCREMENT,
	usuario_id INTEGER NOT NULL,
	en VARCHAR(200) NOT NULL,
	pt VARCHAR(200) NOT NULL,
	caixa INTEGER NOT NULL,
	proxima_revisao DATE NOT NULL,
	acertos INTEGER NOT NULL,
	erros INTEGER NOT NULL,
	criado_em DATETIME NOT NULL DEFAULT (now()),
	PRIMARY KEY (id),
	CONSTRAINT uq_vocabulario_usuario_en UNIQUE (usuario_id, en),
	FOREIGN KEY(usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mensagens (
	id INTEGER NOT NULL AUTO_INCREMENT,
	conversa_id INTEGER NOT NULL,
	papel ENUM('user','assistant') NOT NULL,
	texto TEXT NOT NULL,
	traducao TEXT,
	correcao TEXT,
	criado_em DATETIME NOT NULL DEFAULT (now()),
	PRIMARY KEY (id),
	FOREIGN KEY(conversa_id) REFERENCES conversas (id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS frases (
	id INTEGER NOT NULL AUTO_INCREMENT,
	mensagem_id INTEGER NOT NULL,
	ordem INTEGER NOT NULL,
	en VARCHAR(200) NOT NULL,
	pt VARCHAR(200) NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(mensagem_id) REFERENCES mensagens (id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
