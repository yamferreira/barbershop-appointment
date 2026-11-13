"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { Prisma } from "@/app/generated/prisma"
import { requireBarbeiro } from "@/app/_lib/auth"
import {
  deleteServiceImage,
  isCloudinaryConfigured,
  uploadServiceImage,
} from "@/app/_lib/cloudinary"
import { db } from "@/app/_lib/prisma"
import {
  detectImageType,
  MAX_SERVICE_IMAGE_BYTES,
} from "@/app/_lib/service-image-file"

type ActionResult = { success: true } | { success: false; message: string }

const NOT_FOUND = "Serviço não encontrado. Atualize a página."
const HAS_BOOKINGS =
  "Esse serviço já tem agendamentos e não pode ser apagado. Desative para tirá-lo da tela do cliente."

/**
 * Advisory lock do catálogo de uma barbearia, para criar e reordenar sem duas
 * operações lerem a mesma posição. Espaço 3 (1 = telefone e 2 = conta, em
 * createBooking). É por transação, então funciona atrás do PgBouncer.
 */
const lockCatalog = (tx: Prisma.TransactionClient, barbershopId: string) =>
  tx.$executeRaw`SELECT pg_advisory_xact_lock(3, hashtext(${barbershopId}))`

/**
 * Tudo o que mostra serviço depende do catálogo (home, página da barbearia,
 * listas do admin), então a revalidação é do layout inteiro.
 */
const revalidateCatalog = () => revalidatePath("/", "layout")

const isKnownError = (error: unknown, code: string) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === code

/** "45", "45,5", "45,50", "1.234,56" ou "45.50" → "45.50". */
const parsePrice = (raw: string) => {
  const compact = raw.replace(/\s|R\$/g, "")
  const normalized = compact.includes(",")
    ? compact.replace(/\./g, "").replace(",", ".")
    : compact
  return /^\d{1,4}(\.\d{1,2})?$/.test(normalized) ? normalized : null
}

const serviceSchema = z.object({
  id: z.string().min(1).optional(),
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome do serviço.")
    .max(60, "O nome pode ter até 60 caracteres."),
  description: z
    .string()
    .trim()
    .max(200, "A descrição pode ter até 200 caracteres."),
  price: z.string().transform((value, ctx) => {
    const price = parsePrice(value)
    if (price === null) {
      ctx.addIssue({
        code: "custom",
        message: "Preço inválido. Use só números, como 45 ou 45,90.",
      })
      return z.NEVER
    }
    return price
  }),
  durationMinutes: z.coerce
    .number({ error: "Informe a duração em minutos." })
    .int("A duração precisa ser em minutos inteiros.")
    .min(5, "A duração mínima é 5 minutos.")
    .max(240, "A duração máxima é 240 minutos."),
  removeImage: z.boolean(),
})

const readText = (formData: FormData, key: string) => {
  const value = formData.get(key)
  return typeof value === "string" ? value : ""
}

/**
 * Valida e envia a foto. Devolve a URL nova, uma mensagem de erro, ou
 * `undefined` quando nenhum arquivo veio.
 */
const handleImageUpload = async (
  formData: FormData,
): Promise<{ url?: string; error?: string }> => {
  const image = formData.get("image")
  if (!(image instanceof File) || image.size === 0) return {}

  if (!isCloudinaryConfigured()) {
    return {
      error:
        "O envio de fotos não está configurado no servidor. Salve sem foto por enquanto.",
    }
  }
  if (image.size > MAX_SERVICE_IMAGE_BYTES) {
    return { error: "A foto passou de 2 MB. Escolha outra." }
  }

  const bytes = Buffer.from(await image.arrayBuffer())
  if (bytes.length > MAX_SERVICE_IMAGE_BYTES) {
    return { error: "A foto passou de 2 MB. Escolha outra." }
  }
  if (!detectImageType(bytes)) {
    return { error: "Formato não aceito. Envie uma foto JPEG, PNG ou WebP." }
  }

  try {
    return { url: await uploadServiceImage(bytes) }
  } catch (error) {
    console.error("Falha no upload da foto do serviço", error)
    return { error: "Não foi possível enviar a foto agora. Tente de novo." }
  }
}

/**
 * Cria (sem `id`) ou edita (com `id`) um serviço. A foto, quando vem, já foi
 * redimensionada no navegador; aqui ela é conferida de novo, porque é o
 * servidor que decide.
 *
 * Ordem: valida os campos, confere que o serviço existe, envia a foto e só
 * então grava. Se a gravação falhar, a foto recém-enviada é apagada; se der
 * certo e a foto mudou, a antiga é apagada (só se for da nossa Cloudinary).
 */
export const saveService = async (
  formData: FormData,
): Promise<ActionResult> => {
  await requireBarbeiro()

  const parsed = serviceSchema.safeParse({
    id: readText(formData, "id") || undefined,
    name: readText(formData, "name"),
    description: readText(formData, "description"),
    price: readText(formData, "price"),
    durationMinutes: readText(formData, "durationMinutes"),
    removeImage: readText(formData, "removeImage") === "true",
  })
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0].message }
  }
  const { id, removeImage, ...fields } = parsed.data

  const existing = id
    ? await db.barbershopService.findUnique({
        where: { id },
        select: { imageUrl: true },
      })
    : null
  if (id && !existing) {
    return { success: false, message: NOT_FOUND }
  }

  // Serviço novo vai para a barbearia (o app tem uma só, como na home).
  let barbershopId: string | undefined
  if (!id) {
    const barbershop = await db.barbershop.findFirst({ select: { id: true } })
    if (!barbershop) {
      return { success: false, message: "Nenhuma barbearia cadastrada." }
    }
    barbershopId = barbershop.id
  }

  const upload = await handleImageUpload(formData)
  if (upload.error) {
    return { success: false, message: upload.error }
  }

  // `undefined` = foto não mexida; `null` = removida; string = nova.
  const nextImageUrl =
    upload.url !== undefined ? upload.url : removeImage ? null : undefined

  try {
    if (id) {
      await db.barbershopService.update({
        where: { id },
        data: {
          ...fields,
          ...(nextImageUrl !== undefined && { imageUrl: nextImageUrl }),
        },
      })
    } else if (barbershopId) {
      await db.$transaction(async (tx) => {
        await lockCatalog(tx, barbershopId)
        const last = await tx.barbershopService.aggregate({
          where: { barbershopId },
          _max: { position: true },
        })
        await tx.barbershopService.create({
          data: {
            ...fields,
            barbershopId,
            imageUrl: nextImageUrl ?? null,
            // Serviço novo entra no fim da lista.
            position: (last._max.position ?? 0) + 1,
          },
        })
      })
    }
  } catch (error) {
    await deleteServiceImage(upload.url)
    if (isKnownError(error, "P2025")) {
      return { success: false, message: NOT_FOUND }
    }
    throw error
  }

  if (
    nextImageUrl !== undefined &&
    existing?.imageUrl &&
    existing.imageUrl !== nextImageUrl
  ) {
    await deleteServiceImage(existing.imageUrl)
  }

  revalidateCatalog()
  return { success: true }
}

/**
 * Ativa ou desativa. Inativo some da tela do cliente e é recusado pelo
 * createBooking, mas os agendamentos que já existem continuam intactos.
 */
export const setServiceActive = async (
  id: string,
  active: boolean,
): Promise<ActionResult> => {
  await requireBarbeiro()

  if (typeof id !== "string" || typeof active !== "boolean") {
    return { success: false, message: NOT_FOUND }
  }

  try {
    await db.barbershopService.update({ where: { id }, data: { active } })
  } catch (error) {
    if (isKnownError(error, "P2025")) {
      return { success: false, message: NOT_FOUND }
    }
    throw error
  }

  revalidateCatalog()
  return { success: true }
}

/**
 * Troca o serviço de lugar com o vizinho de cima ou de baixo. A lista do
 * admin inclui os inativos, então a troca também: a posição de um inativo é
 * guardada para quando ele voltar.
 */
export const moveService = async (
  id: string,
  direction: "up" | "down",
): Promise<ActionResult> => {
  await requireBarbeiro()

  if (typeof id !== "string" || (direction !== "up" && direction !== "down")) {
    return { success: false, message: NOT_FOUND }
  }

  const found = await db.barbershopService.findUnique({
    where: { id },
    select: { barbershopId: true },
  })
  if (!found) {
    return { success: false, message: NOT_FOUND }
  }

  const moved = await db.$transaction(async (tx) => {
    await lockCatalog(tx, found.barbershopId)

    // Relido depois do lock: a posição pode ter mudado enquanto esperava.
    const current = await tx.barbershopService.findUnique({
      where: { id },
      select: { position: true },
    })
    if (!current) return false

    const neighbor = await tx.barbershopService.findFirst({
      where: {
        barbershopId: found.barbershopId,
        position:
          direction === "up"
            ? { lt: current.position }
            : { gt: current.position },
      },
      orderBy: { position: direction === "up" ? "desc" : "asc" },
      select: { id: true, position: true },
    })
    // Já está na ponta: nada a fazer, e não é erro.
    if (!neighbor) return true

    await tx.barbershopService.update({
      where: { id },
      data: { position: neighbor.position },
    })
    await tx.barbershopService.update({
      where: { id: neighbor.id },
      data: { position: current.position },
    })
    return true
  })

  if (!moved) {
    return { success: false, message: NOT_FOUND }
  }

  revalidateCatalog()
  return { success: true }
}

/**
 * Apaga de vez, só quando nenhum agendamento usa o serviço (nem na relação
 * antiga `Booking.serviceId`, nem na junção `BookingService`). A contagem é
 * para a mensagem; quem garante é a FK, que vira P2003 se um agendamento
 * entrar entre a contagem e o delete.
 */
export const deleteService = async (id: string): Promise<ActionResult> => {
  await requireBarbeiro()

  if (typeof id !== "string") {
    return { success: false, message: NOT_FOUND }
  }

  const service = await db.barbershopService.findUnique({
    where: { id },
    select: {
      imageUrl: true,
      _count: { select: { bookings: true, bookingServices: true } },
    },
  })
  if (!service) {
    return { success: false, message: NOT_FOUND }
  }
  if (service._count.bookings > 0 || service._count.bookingServices > 0) {
    return { success: false, message: HAS_BOOKINGS }
  }

  try {
    await db.barbershopService.delete({ where: { id } })
  } catch (error) {
    if (isKnownError(error, "P2003")) {
      return { success: false, message: HAS_BOOKINGS }
    }
    if (isKnownError(error, "P2025")) {
      return { success: false, message: NOT_FOUND }
    }
    throw error
  }

  await deleteServiceImage(service.imageUrl)

  revalidateCatalog()
  return { success: true }
}
