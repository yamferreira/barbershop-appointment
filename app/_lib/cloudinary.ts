import "server-only"

import { v2 as cloudinary, type UploadApiResponse } from "cloudinary"
import { getCloudinaryPublicId } from "./cloudinary-url"

/** Pasta das fotos de serviço na conta. Só o que está aqui é apagado. */
export const SERVICE_IMAGE_FOLDER = "barbearia/servicos"

/**
 * Credenciais da Cloudinary, ou null se faltar alguma. Sem elas o resto do
 * cadastro continua funcionando: só o envio de foto fica indisponível, com
 * aviso na tela.
 */
const getConfig = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim()
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim()
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim()
  if (!cloudName || !apiKey || !apiSecret) return null
  return { cloudName, apiKey, apiSecret }
}

export const isCloudinaryConfigured = () => getConfig() !== null

const configure = () => {
  const config = getConfig()
  if (!config) return null
  cloudinary.config({
    cloud_name: config.cloudName,
    api_key: config.apiKey,
    api_secret: config.apiSecret,
    secure: true,
  })
  return config
}

/**
 * Envia a foto (já validada pelo chamador) e devolve a URL https original,
 * sem transformação; a entrega otimizada é montada na exibição.
 */
export const uploadServiceImage = async (bytes: Buffer): Promise<string> => {
  if (!configure()) {
    throw new Error("Cloudinary não configurada")
  }

  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: SERVICE_IMAGE_FOLDER,
          resource_type: "image",
          // Segunda barreira, do lado da Cloudinary, além da checagem de
          // assinatura feita antes do envio.
          allowed_formats: ["jpg", "png", "webp"],
        },
        (error, response) => {
          if (error || !response)
            reject(error ?? new Error("Upload sem resposta"))
          else resolve(response)
        },
      )
      .end(bytes)
  })

  return result.secure_url
}

/**
 * Apaga a foto antiga de um serviço, se ela for desta conta e desta pasta.
 * URLs de outro lugar (utfs.io, arquivos em /public) ficam intactas.
 *
 * Nunca lança: a foto antiga sobrando na Cloudinary não pode desfazer um
 * cadastro que já foi salvo. A falha fica no log.
 */
export const deleteServiceImage = async (url: string | null | undefined) => {
  if (!url) return
  const config = configure()
  if (!config) return

  const publicId = getCloudinaryPublicId(url, config.cloudName)
  if (!publicId || !publicId.startsWith(`${SERVICE_IMAGE_FOLDER}/`)) return

  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
      invalidate: true,
    })
  } catch (error) {
    console.error("Falha ao apagar foto antiga na Cloudinary", publicId, error)
  }
}
