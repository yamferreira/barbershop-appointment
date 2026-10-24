-- Agenda por barbeiro: entra o model Barber (Luiz e TH) e Booking/BlockedDate
-- passam a conhecer o barbeiro.
--
-- Há agendamentos reais no banco, então a migração é feita em etapas dentro de
-- uma única transação (o Prisma executa o arquivo inteiro de uma vez): se
-- qualquer passo falhar, nada é gravado. A ordem importa:
--   1. cria Barber e insere os dois barbeiros;
--   2. adiciona Booking.barberId NULLABLE;
--   3. faz o backfill de TODOS os agendamentos existentes para o Luiz;
--   4. só então NOT NULL (falha, e reverte tudo, se sobrar alguma linha nula);
--   5. troca o índice único de agendamento ativo de (date) para (barberId, date).
--
-- `calendarToken` é gerado aqui, no banco, e nunca aparece no repositório:
-- duas UUIDs v4 (gen_random_uuid() usa o CSPRNG do Postgres, sem depender de
-- extensão) viram 32 bytes em hex (64 caracteres).

-- CreateTable
CREATE TABLE "Barber" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "calendarToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Barber_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Barber_name_key" ON "Barber"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Barber_calendarToken_key" ON "Barber"("calendarToken");

-- Seed dos barbeiros. clock_timestamp() (e não CURRENT_TIMESTAMP, que é fixo
-- dentro da transação) mantém o Luiz antes do TH na ordenação por createdAt.
INSERT INTO "Barber" ("id", "name", "active", "calendarToken", "createdAt", "updatedAt")
VALUES (
    gen_random_uuid()::text,
    'Luiz',
    true,
    encode(decode(replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''), 'hex'), 'hex'),
    clock_timestamp(),
    clock_timestamp()
);

INSERT INTO "Barber" ("id", "name", "active", "calendarToken", "createdAt", "updatedAt")
VALUES (
    gen_random_uuid()::text,
    'TH',
    true,
    encode(decode(replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''), 'hex'), 'hex'),
    clock_timestamp(),
    clock_timestamp()
);

-- AlterTable
-- Entra nullable para que as linhas existentes sejam preenchidas pelo backfill
-- abaixo antes do NOT NULL.
ALTER TABLE "Booking" ADD COLUMN "barberId" TEXT;

-- Backfill: toda a agenda existente era do Luiz.
UPDATE "Booking"
SET "barberId" = (SELECT "id" FROM "Barber" WHERE "name" = 'Luiz');

-- Só agora o NOT NULL: se algum agendamento tivesse ficado sem barbeiro, esta
-- linha falha e a migração inteira reverte, em vez de gravar dado pela metade.
ALTER TABLE "Booking" ALTER COLUMN "barberId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_barberId_fkey" FOREIGN KEY ("barberId") REFERENCES "Barber"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Booking_barberId_date_idx" ON "Booking"("barberId", "date");

-- Unicidade de agendamento ativo passa de (date) para (barberId, date): dois
-- agendamentos no mesmo horário só são permitidos se forem de barbeiros
-- diferentes. O predicado parcial continua o mesmo: CANCELADO fica de fora e o
-- horário volta a ficar livre.
-- DropIndex
DROP INDEX "Booking_date_active_key";

-- CreateIndex
CREATE UNIQUE INDEX "Booking_barberId_date_active_key" ON "Booking"("barberId", "date") WHERE "status" <> 'CANCELADO';

-- BlockedDate: barberId nulo = barbearia inteira (todas as linhas existentes
-- são feriados/bloqueios gerais, então não há backfill); preenchido = só aquele
-- barbeiro.
-- AlterTable
ALTER TABLE "BlockedDate" ADD COLUMN "barberId" TEXT;

-- AddForeignKey
ALTER TABLE "BlockedDate" ADD CONSTRAINT "BlockedDate_barberId_fkey" FOREIGN KEY ("barberId") REFERENCES "Barber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "BlockedDate_date_idx" ON "BlockedDate"("date");

-- A unicidade de `date` sozinha cai. Um UNIQUE(date, barberId) comum não
-- bastaria: o Postgres trata NULL como distinto e deixaria passar dois
-- bloqueios da barbearia inteira no mesmo dia. Por isso dois índices parciais.
-- DropIndex
DROP INDEX "BlockedDate_date_key";

-- CreateIndex
CREATE UNIQUE INDEX "BlockedDate_date_shop_key" ON "BlockedDate"("date") WHERE "barberId" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "BlockedDate_date_barber_key" ON "BlockedDate"("date", "barberId") WHERE "barberId" IS NOT NULL;
