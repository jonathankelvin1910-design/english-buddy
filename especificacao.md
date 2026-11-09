# English Buddy: conversa em inglês com uma IA

Site para praticar inglês conversando com uma IA como se fosse um amigo. A IA responde em inglês do dia a dia, a resposta aparece em legenda e é falada em voz alta, com tradução opcional. Cada pessoa tem login e acesso ao histórico completo das suas conversas.

**Tecnologias:** MySQL 8 · Python + FastAPI + SQLAlchemy + PyMySQL · React (Vite) + Axios · IA local via Ollama (com troca fácil por outra IA)

## Etapas (parar após cada uma e aguardar confirmação)
1. Banco de dados: `database/schema.sql` (pronto)
2. Backend: login, conversas, mensagens e a IA (testar em http://localhost:8000/docs)
3. Frontend: login, tela de conversa, cartões de frases, histórico
4. Voz: ouvir a resposta (voz do navegador) e falar com o microfone
5. Extras: correções, vocabulário salvo, cenários, níveis
6. README, capturas e publicação

## Conceitos
- **Conversa:** sequência de mensagens entre o usuário e a IA. Pertence a um único usuário.
- **Mensagem:** o que o usuário disse (`user`) ou o que a IA respondeu (`assistant`), com `traducao` opcional e `correcao` opcional.
- **Frases:** até 3 expressões curtas por resposta da IA, com inglês e português lado a lado. Aparecem em cartões no meio da tela, com botões de anterior e próximo.
- **Preferências do usuário:** nível (A1 a C1), idioma da voz (`en` ou `pt`), idioma da legenda (`en`, `pt` ou `ambos`) e velocidade da voz.

## IA (camada trocável)
O backend fala com a IA por uma interface única (`app/ia/`). A primeira implementação usa o Ollama local (`OLLAMA_URL` e `OLLAMA_MODEL` no `.env`). Trocar por outra IA depois é criar um novo arquivo nessa pasta e mudar uma variável.

A IA recebe um prompt de sistema com o nível do usuário ("conversa de amigo, frases curtas, sem textão") e as últimas 12 mensagens. Ela deve responder SEMPRE em JSON:

    {
      "en": "resposta em inglês",
      "pt": "tradução em português",
      "frases": [{"en": "How was your day?", "pt": "Como foi o seu dia?"}],
      "correcao": null
    }

`correcao` é `null` ou `{"original": "...", "corrigida": "...", "explicacao": "..."}` (explicação em português). O backend valida o JSON; se vier inválido, tenta mais uma vez e, se falhar de novo, devolve um erro claro (nunca uma resposta quebrada).

## API
| Método | Rota | Descrição |
|---|---|---|
| GET | `/health` | Verificação de saúde |
| POST | `/auth/registrar` | Cria a conta (`email`, `senha`, `nome`) |
| POST | `/auth/entrar` | Devolve um token de acesso |
| GET | `/auth/eu` | Dados e preferências do usuário logado |
| PATCH | `/auth/eu` | Altera nível, voz, legenda e velocidade |
| GET | `/conversas/` | Lista as conversas do usuário (mais recentes primeiro) |
| POST | `/conversas/` | Cria uma conversa nova |
| GET | `/conversas/{id}` | Mensagens e frases da conversa |
| PATCH | `/conversas/{id}` | Renomeia a conversa |
| DELETE | `/conversas/{id}` | Apaga a conversa |
| POST | `/conversas/{id}/mensagens` | Envia uma mensagem e devolve a resposta da IA |

## Segurança (regras do projeto)
- Senha guardada só como hash (bcrypt), nunca em texto. Mínimo de 8 caracteres.
- Token JWT com validade curta. A chave secreta fica no `.env`, fora do Git.
- Toda rota de conversa confere que a conversa é do usuário logado (um usuário nunca vê dados de outro; devolve 404, não 403).
- Mensagem do usuário limitada a 500 caracteres. Limite de tentativas no login.
- CORS apenas para http://localhost:5173. Dados pessoais só o necessário; o usuário pode apagar suas conversas.

## Frontend
- Tema escuro, no mesmo estilo dos outros projetos.
- **Tela de conversa:** legenda da resposta da IA no centro, cartões de frases com inglês e tradução lado a lado e botões Anterior/Próximo, campo de texto e botão de microfone, seletores de idioma da voz e da legenda.
- **Histórico:** lista de conversas anteriores; abrir uma mostra tudo que foi dito.
- **Login e cadastro.**
- Em telas pequenas, tudo em uma coluna.
