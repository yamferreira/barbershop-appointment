/**
 * Regras do arquivo de foto de serviço, compartilhadas entre o navegador (que
 * redimensiona antes de enviar) e o servidor (que é quem decide).
 */

/** Limite do arquivo que chega ao servidor, já redimensionado. */
export const MAX_SERVICE_IMAGE_BYTES = 2 * 1024 * 1024

/** Lado maior da foto depois do redimensionamento no navegador. */
export const SERVICE_IMAGE_MAX_SIDE = 1000

export type ServiceImageType = "jpeg" | "png" | "webp"

/**
 * Tipo real da imagem pelos primeiros bytes (assinatura do formato). O
 * `type` do File e a extensão vêm do client e não provam nada.
 */
export const detectImageType = (bytes: Uint8Array): ServiceImageType | null => {
  // JPEG: FF D8 FF
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "jpeg"
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  if (bytes.length >= png.length && png.every((byte, i) => bytes[i] === byte)) {
    return "png"
  }
  // WebP: "RIFF" ???? "WEBP"
  const ascii = (start: number, end: number) =>
    String.fromCharCode(...bytes.subarray(start, end))
  if (bytes.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") {
    return "webp"
  }
  return null
}
