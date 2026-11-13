/**
 * URLs da Cloudinary sem depender do SDK nem de segredo: roda no navegador
 * (loader do next/image) e no servidor (para achar o que apagar).
 *
 * O banco guarda a URL original do upload, sem transformação:
 * https://res.cloudinary.com/<cloud>/image/upload/v<versão>/<public_id>.<ext>
 * As transformações de entrega entram só na hora de exibir.
 */

const CLOUDINARY_HOST = "res.cloudinary.com"
const UPLOAD_SEGMENT = "/image/upload/"

export const isCloudinaryUrl = (url: string) => {
  try {
    return new URL(url).host === CLOUDINARY_HOST
  } catch {
    return false
  }
}

/**
 * Loader do next/image para fotos da Cloudinary: a própria Cloudinary entrega
 * no melhor formato que o navegador aceita (`f_auto`), com qualidade
 * automática (`q_auto`) e na largura que o next/image pediu para aquele
 * tamanho de tela. `c_limit` nunca aumenta a foto além do original.
 */
export const cloudinaryLoader = ({
  src,
  width,
}: {
  src: string
  width: number
}) => {
  const index = src.indexOf(UPLOAD_SEGMENT)
  if (index === -1) return src
  const head = src.slice(0, index + UPLOAD_SEGMENT.length)
  const tail = src.slice(index + UPLOAD_SEGMENT.length)
  return `${head}f_auto,q_auto,c_limit,w_${width}/${tail}`
}

/**
 * `public_id` de uma URL de upload da conta `cloudName`, ou null se a URL não
 * for dessa conta ou não tiver o formato que o upload devolve. Quem apaga só
 * apaga o que conseguiu identificar com certeza.
 */
export const getCloudinaryPublicId = (url: string, cloudName: string) => {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (parsed.host !== CLOUDINARY_HOST) return null

  const prefix = `/${cloudName}${UPLOAD_SEGMENT}`
  if (!parsed.pathname.startsWith(prefix)) return null

  const rest = decodeURIComponent(parsed.pathname.slice(prefix.length))
  const match = rest.match(/^(?:v\d+\/)?(.+?)\.[a-z0-9]+$/i)
  return match ? match[1] : null
}
