# Bolao da Copa

Aplicacao completa para bolao da Copa do Mundo com frontend web, API REST e persistencia em SQLite nativo do Node.js.

## O que a aplicacao cobre

- Criacao de usuarios.
- Criacao de grupos privados com convite para amigos.
- Frontend servido na rota raiz com painel para palpites, grupos e ranking.
- Seed da Copa do Mundo 2026 com 12 grupos, 48 selecoes e 104 partidas.
- Palpites de placar na fase de grupos e no mata-mata.
- Palpites de penaltis e de quem se classifica no mata-mata.
- Palpites de classificacao final de cada grupo.
- Ranking por grupo de amigos com 3 pontos para placar cravado e 1 ponto para acerto do vencedor ou classificado.
- Bloqueio de alteracao dos palpites assim que a partida comeca.

## Stack

- Node.js
- Express
- SQLite
- TypeScript

## Como rodar

```bash
npm.cmd install
npm.cmd run setup
npm.cmd run dev
```

API em `http://localhost:3000`.

Frontend em `http://localhost:3000/`.

## Deploy no Railway

O projeto agora inclui um [Dockerfile](C:/Users/Pedro/programacao/software/bolao_copa/Dockerfile) pronto para deploy.

### Fluxo recomendado

1. Suba o repositório no Railway como serviço com Dockerfile.
2. Configure um volume persistente montado em `/app/data`.
3. Exponha a porta padrão do serviço.

### Observacoes

- O container executa um bootstrap idempotente antes de iniciar a API.
- Esse bootstrap cria as tabelas e semeia a Copa 2026 apenas se o banco ainda estiver vazio.
- O caminho do banco pode ser alterado com a variavel `DATA_DIR`, mas o padrão no container é `/app/data`.
- Sem volume persistente, o SQLite funciona, mas os dados podem ser perdidos em novos deploys ou reinicios do container.

## Endpoints principais

- `GET /health`
- `GET /tournaments`
- `GET /tournaments/:slug/overview`
- `GET /tournaments/:slug/groups/:code/standings`
- `GET /matches?tournamentSlug=copa-do-mundo-2026`
- `POST /users`
- `POST /pool-groups`
- `POST /pool-groups/join`
- `GET /pool-groups/:id/leaderboard`
- `POST /predictions/matches`
- `POST /predictions/groups`
- `GET /predictions/users/:userId?tournamentSlug=copa-do-mundo-2026`
- `PATCH /matches/:id/result`
- `PATCH /matches/:id/participants`

## Experiencia web

- Cadastro rapido de usuario no navegador.
- Criacao e entrada em grupos por codigo de convite.
- Ranking do grupo na mesma tela.
- Palpites para partidas com travamento automatico apos o inicio do jogo.
- Palpites de classificacao dos grupos.

## Regras implementadas

- Placar exato vale `3` pontos.
- Acerto apenas do vencedor na fase de grupos vale `1` ponto.
- No mata-mata, acertar apenas quem se classifica vale `1` ponto.
- Em empate no mata-mata, o palpite precisa incluir penaltis.
- O backend nao permite alterar palpites depois de `kickoffAt`.

## Observacao sobre o seed

O seed ja cria todas as partidas da Copa 2026. As partidas da fase de grupos entram com selecoes definidas. As partidas do mata-mata entram com placeholders oficiais de classificacao, como `1A`, `2B` e `Melhor 3o`, para que as selecoes sejam preenchidas conforme os grupos forem fechando.
