import { PrismaClient } from "../app/generated/prisma"
console.log("Seed rodando")
const prisma = new PrismaClient()

const NOBRE_BARBEARIA = {
  name: "Nobre Barbearia",
  address:
    "R. Virgílio Martins de Oliveira, 438 - Centro, Francisco Morato - SP, 07901-020",
  phone: ["11913346096"],
  description: "Cortes de cabelo e barba com hora marcada.",
  imageUrl: "/logoluizdois.png",
}

async function seedDatabase() {
  try {
    // Casa pela única barbearia existente, não pelo nome — senão, ao
    // renomear a marca, o seed cria uma barbearia nova em vez de
    // atualizar a que já existe.
    const existing = await prisma.barbershop.findFirst()

    const barbershop = existing
      ? await prisma.barbershop.update({
          where: { id: existing.id },
          data: NOBRE_BARBEARIA,
        })
      : await prisma.barbershop.create({ data: NOBRE_BARBEARIA })

    console.log("Nobre Barbearia:", barbershop)
  } catch (error) {
    console.error("Erro ao rodar o seed:", error)
  } finally {
    await prisma.$disconnect()
  }
}

seedDatabase()
