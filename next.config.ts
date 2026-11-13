import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Fotos antigas dos serviços.
      {
        hostname: "utfs.io",
      },
      // Fotos enviadas pelo admin. Normalmente saem pelo loader da própria
      // Cloudinary (ServiceImage), mas o host fica liberado para qualquer
      // next/image que receba a URL direto.
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  experimental: {
    serverActions: {
      // A foto de serviço chega pela server action. O limite padrão é 1 MB e
      // a foto pode ter até 2 MB depois do redimensionamento; a folga cobre o
      // multipart e os campos de texto. O limite de verdade (2 MB) é checado
      // na action.
      bodySizeLimit: "3mb",
    },
  },
}

export default nextConfig
