# Deploy

Checklist para levar mudanças de banco (migrações Prisma) para produção.
Stack: Next.js + Prisma + PostgreSQL (Neon).

## Conceito em uma linha

No **desenvolvimento** você usa `prisma migrate dev` (cria e aplica migração
no banco de dev). Na **produção** você usa `prisma migrate deploy`, que apenas
aplica as migrações já commitadas, em ordem, sem gerar nada novo.

Você pode acumular várias migrações no dev e aplicá-las todas de uma vez no
deploy — não precisa aplicar uma por uma.

## Variáveis de ambiente

O modelo está em `.env.example`. Em produção (Vercel: _Settings → Environment
Variables_) todas são obrigatórias.

| Variável                | Para quê                                                                                                                                                                                              |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`          | Conexão do app com o Postgres, pelo endpoint **com pooler** (host com `-pooler`). É a que o app usa em runtime.                                                                                       |
| `DIRECT_URL`            | Conexão **direta**: o mesmo host **sem** `-pooler`. Só serve para migrações (`prisma migrate`), que usam advisory lock de sessão e não funcionam por pooler. O app não a usa em runtime.              |
| `AUTH_SECRET`           | Segredo do Auth.js, que assina e criptografa os cookies de sessão. Gere com `openssl rand -base64 32`. Use um valor diferente em cada ambiente; trocar o valor derruba as sessões existentes.         |
| `GOOGLE_CLIENT_ID`      | ID do cliente OAuth do Google (login dos clientes e do barbeiro).                                                                                                                                     |
| `GOOGLE_CLIENT_SECRET`  | Segredo do cliente OAuth do Google.                                                                                                                                                                   |
| `CRON_SECRET`           | Segredo longo e aleatório que protege `/api/cron/sync-holidays` (ver a seção de cron abaixo). Sem ele a rota responde 500.                                                                            |
| `CLOUDINARY_CLOUD_NAME` | Nome da conta Cloudinary onde ficam as fotos dos serviços (_Settings → API Keys_).                                                                                                                    |
| `CLOUDINARY_API_KEY`    | Chave da API da Cloudinary.                                                                                                                                                                           |
| `CLOUDINARY_API_SECRET` | Segredo da API da Cloudinary. Só o servidor usa; nunca vai para o navegador. Sem as três variáveis o cadastro de serviços continua funcionando, mas o envio de foto fica indisponível (a tela avisa). |

### Login com Google: URI de redirecionamento

No Google Cloud Console (_APIs e serviços → Credenciais → ID do cliente OAuth_),
em **URIs de redirecionamento autorizados**, cadastre:

```
https://SEU-DOMINIO/api/auth/callback/google
```

Para desenvolvimento local, cadastre também
`http://localhost:3000/api/auth/callback/google`. Se a URI não bater exatamente
com a do deploy, o login falha com `redirect_uri_mismatch`.

### Build na Vercel

- **`prisma generate`** roda no `postinstall` (`package.json`). O client é
  gerado em `app/generated/prisma`, que está no `.gitignore`; sem esse passo o
  build quebraria por falta do client.
- **`prisma migrate deploy` NÃO roda no build.** As migrações são aplicadas
  **manualmente**, antes (ou junto) do deploy, usando a `DIRECT_URL` de produção
  (passo a passo abaixo). Assim um deploy nunca altera o banco por conta própria.

## Passo a passo do deploy

1. Garanta que tudo está commitado e no remoto:

   ```bash
   git status          # working tree limpo
   git push origin master
   ```

2. No ambiente que tem acesso ao banco de produção, com a `DATABASE_URL` e a
   `DIRECT_URL` de **produção** carregadas (o `migrate deploy` conecta pela
   `DIRECT_URL`):

   ```bash
   git pull                    # traz todas as migrações commitadas
   npx prisma migrate deploy   # aplica as pendentes, em ordem
   ```

3. Build e deploy da app normalmente (`npm run build` / plataforma de hosting).

`migrate deploy` é idempotente: só aplica o que ainda não rodou. Rodar de novo
sem migrações novas não faz nada.

## Cuidados

- **Nunca edite uma migração já aplicada em produção.** Ela é imutável. Para
  corrigir algo, crie uma migração **nova** por cima.
- **Não altere o schema de produção por fora do Prisma** (SQL manual, alteração
  no painel do Neon). Isso gera _drift_ e o `migrate deploy` pode falhar. Se
  precisar, faça via migração.
- **Dev e produção devem compartilhar o mesmo histórico de migrações.** É o que
  garante que `migrate deploy` aplique a sequência limpa.
- **Migrações que apagam ou transformam dados** (remover coluna, tornar campo
  obrigatório, mudar tipo) pedem revisão do SQL gerado antes de ir pra prod,
  por risco de perda de dado. As de índice/coluna nova são de baixo risco.
- **Migrações com SQL cru** (ex.: índices parciais — ver abaixo) não são
  validadas pelo Prisma sozinho. Vale testar num branch do banco antes.

## Testar antes com um branch do Neon (recomendado)

O Neon permite criar um branch do banco (cópia com os dados) para ensaiar o
deploy sem risco:

1. Crie um branch do banco no painel do Neon.
2. Aponte `DATABASE_URL` para o branch e rode `npx prisma migrate deploy`.
3. Confirme que aplicou sem erro; depois descarte o branch.

## Cron: sincronização automática de feriados

O barbeiro pode sincronizar os feriados nacionais à mão em `/admin/bloqueios`,
mas o mesmo trabalho roda sozinho por uma rota protegida:

```
GET /api/cron/sync-holidays
Authorization: Bearer $CRON_SECRET
```

A rota bloqueia os feriados nacionais deste ano e do próximo (fora dezembro,
que segue sendo decisão manual). É idempotente: só cria o que ainda não existe
e nunca mexe em bloqueio manual, então rodar de novo não duplica nada.

### 1. Gere e configure o segredo

```bash
openssl rand -hex 32
```

Qualquer string longa e aleatória serve. Salve como `CRON_SECRET` nas variáveis de ambiente da produção. **Sem essa
variável a rota responde 500 e não roda** — ela falha fechada de propósito, pra
não virar um gatilho público se o deploy esquecer de configurá-la.

### 2. Agende a chamada

Feriado não muda de data no meio do ano, então **uma vez por mês é de sobra**.
O importante é que rode ao menos uma vez entre outubro e dezembro, que é quando
o calendário do ano seguinte passa a importar.

- **Vercel** — crie um `vercel.json` na raiz:

  ```json
  {
    "crons": [{ "path": "/api/cron/sync-holidays", "schedule": "0 3 1 * *" }]
  }
  ```

  A Vercel envia o header `Authorization: Bearer $CRON_SECRET` sozinha quando a
  variável existe no projeto — não precisa configurar o header à mão. Confira o
  limite de frequência do seu plano (no Hobby os crons rodam no máximo uma vez
  por dia, o que já cobre um agendamento mensal).

- **Railway / Render** — crie um cron job no painel apontando pro endpoint:

  ```bash
  curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
    https://<seu-host>/api/cron/sync-holidays
  ```

- **VPS / Docker** — no crontab (`crontab -e`), dia 1 às 3h:

  ```cron
  0 3 1 * * curl -fsS -H "Authorization: Bearer SEU_SEGREDO" https://<seu-host>/api/cron/sync-holidays
  ```

### 3. Confira

Uma chamada bem-sucedida responde `{"created":N}`. Erros: `401` (segredo errado
ou ausente), `500` (`CRON_SECRET` não configurado), `502` (BrasilAPI fora do ar
— o agendamento seguinte resolve).

## Notas específicas deste projeto

- As migrações `20260729035234_booking_partial_unique_active`,
  `20260804021500_booking_partial_unique_by_date` e
  `20261022022843_add_barber` usam **SQL cru** para criar índices únicos
  **parciais**. O estado atual é:

  ```sql
  CREATE UNIQUE INDEX "Booking_barberId_date_active_key"
    ON "Booking"("barberId", "date")
    WHERE "status" <> 'CANCELADO';

  CREATE UNIQUE INDEX "BlockedDate_date_shop_key"
    ON "BlockedDate"("date")
    WHERE "barberId" IS NULL;

  CREATE UNIQUE INDEX "BlockedDate_date_barber_key"
    ON "BlockedDate"("date", "barberId")
    WHERE "barberId" IS NOT NULL;
  ```

  O primeiro garante no máximo um agendamento **ativo** por barbeiro e horário,
  deixando horários `CANCELADO` livres para novo agendamento: dois agendamentos
  no mesmo horário só são permitidos se forem de barbeiros diferentes. Os outros
  dois garantem um bloqueio por dia para a barbearia inteira (`barberId` nulo) e
  um por dia e barbeiro; um `UNIQUE(date, barberId)` comum não bastaria, porque o
  Postgres trata `NULL` como distinto. O Prisma não expressa índice parcial no
  schema declarativo, por isso eles existem só na migração (o schema tem
  `@@index` comuns no lugar).

  **Migração `add_barber` (agenda por barbeiro).** Roda em uma única transação e
  em etapas, porque havia agendamentos reais: cria `Barber` e insere Luiz e TH,
  adiciona `Booking.barberId` nullable, faz o backfill de **todos** os
  agendamentos para o Luiz e só então aplica `NOT NULL` (se sobrar uma linha
  nula, a migração inteira reverte). O `calendarToken` de cada barbeiro é gerado
  no próprio SQL (`gen_random_uuid()` ×2 → 32 bytes em hex), então o token nunca
  vai para o repositório. Antes de aplicar em um banco com dados, tire um
  snapshot JSON e confira depois as contagens, que nenhum `Booking` ficou sem
  `barberId` e os índices em `pg_indexes`. O seed só faz upsert por nome e nunca
  regenera o token.

  **Atenção no deploy de uma migração de índice único:** se a base já tiver
  linhas que violem o índice novo, o `CREATE UNIQUE INDEX` **falha** e a
  migração não aplica. No caso de `Booking`, cheque antes:

  ```sql
  SELECT "barberId", "date", COUNT(*) FROM "Booking"
  WHERE "status" <> 'CANCELADO'
  GROUP BY "barberId", "date" HAVING COUNT(*) > 1;
  ```

- **Advisory lock no Neon:** ao rodar migrações pela conexão _pooled_
  (host com `-pooler`), o Prisma pode falhar com timeout de advisory lock
  (`P1002`) — o PgBouncer não suporta advisory lock de sessão. Costuma resolver
  ao tentar de novo, ou usando a conexão **direta** (host sem `-pooler`) para
  as migrações.

- **`prisma generate` no Windows:** se o dev server estiver rodando, ele trava a
  DLL do query engine e o `generate` falha com `EPERM`. Pare o servidor antes de
  regenerar o client.
