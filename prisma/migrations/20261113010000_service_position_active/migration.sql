-- Catálogo de serviços gerenciável pelo admin: ordem, ativo/inativo e foto
-- opcional.
--
-- Há serviços e agendamentos reais no banco, então a migração é feita em
-- etapas dentro de uma única transação (o Prisma executa o arquivo inteiro de
-- uma vez): se qualquer passo falhar, nada é gravado. Nenhuma linha existente
-- muda de valor, só ganha colunas:
--   1. `active` entra com DEFAULT true, então todo serviço atual continua
--      visível para o cliente;
--   2. `position` entra NULLABLE, recebe 1, 2, 3... pela ordem de cadastro
--      (a mesma ordem que as telas usavam até aqui) e só então vira NOT NULL;
--   3. `imageUrl` deixa de ser obrigatório. Os valores atuais ficam como estão.

-- AlterTable
ALTER TABLE "BarbershopService" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "BarbershopService" ADD COLUMN "position" INTEGER;

-- Backfill: ordem de cadastro, por barbearia. O `id` desempata dois serviços
-- criados no mesmo instante, para o resultado não depender do plano da query.
UPDATE "BarbershopService" s
SET "position" = ordered.rn
FROM (
    SELECT "id", ROW_NUMBER() OVER (PARTITION BY "barbershopId" ORDER BY "createdAt", "id") AS rn
    FROM "BarbershopService"
) ordered
WHERE ordered."id" = s."id";

-- Só agora o NOT NULL: se algum serviço tivesse ficado sem posição, esta linha
-- falha e a migração inteira reverte, em vez de gravar dado pela metade.
ALTER TABLE "BarbershopService" ALTER COLUMN "position" SET NOT NULL;

-- AlterTable
ALTER TABLE "BarbershopService" ALTER COLUMN "imageUrl" DROP NOT NULL;
