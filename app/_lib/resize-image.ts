import { SERVICE_IMAGE_MAX_SIDE } from "./service-image-file"

const QUALITY = 0.85

const toBlob = (canvas: HTMLCanvasElement, type: string) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, QUALITY))

/**
 * Redimensiona a foto no navegador antes do envio: lado maior em até 1000px,
 * em WebP. Foto de celular tem 3 a 10 MB e não precisa sair do aparelho
 * assim.
 *
 * Navegador que não codifica WebP no canvas devolve PNG em silêncio; nesse
 * caso vai JPEG, que o servidor também aceita e fica bem menor que PNG.
 */
export const resizeImageForUpload = async (file: File): Promise<File> => {
  // `imageOrientation` respeita a rotação EXIF das fotos de celular.
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  })
  try {
    const scale = Math.min(
      1,
      SERVICE_IMAGE_MAX_SIDE / Math.max(bitmap.width, bitmap.height),
    )
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)

    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext("2d")
    if (!context) throw new Error("Canvas indisponível")
    context.drawImage(bitmap, 0, 0, width, height)

    let blob = await toBlob(canvas, "image/webp")
    let extension = "webp"
    if (!blob || blob.type !== "image/webp") {
      blob = await toBlob(canvas, "image/jpeg")
      extension = "jpg"
    }
    if (!blob) throw new Error("Não foi possível converter a imagem")

    return new File([blob], `servico.${extension}`, { type: blob.type })
  } finally {
    bitmap.close()
  }
}
