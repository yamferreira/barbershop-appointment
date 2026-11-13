import Image from "next/image"
import { cn } from "@/app/_lib/utils"

interface ServiceImageProps {
  src: string | null
  alt: string
  /** Largura exibida, para o `sizes` do next/image (ex.: "56px"). */
  sizes: string
  className?: string
}

/**
 * Foto de um serviço, ocupando o pai inteiro (o pai precisa ser `relative` e
 * ter tamanho). A foto é opcional: sem ela, entra o mesmo ícone de tesoura
 * para todo serviço, nas cores da marca, em vez de um buraco na grade.
 *
 * O ícone é SVG inline, sem depender de arquivo nem de biblioteca.
 */
const ServiceImage = ({ src, alt, sizes, className }: ServiceImageProps) => {
  if (src) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className={cn("object-cover", className)}
      />
    )
  }

  return (
    <div
      role="img"
      aria-label={alt}
      className={cn(
        "absolute inset-0 flex items-center justify-center bg-[var(--brand-forest)] text-[var(--brand-gold)]",
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="h-1/2 w-1/2"
      >
        <circle cx="6" cy="6" r="3" />
        <circle cx="6" cy="18" r="3" />
        <path d="M8.12 8.12 12 12" />
        <path d="M20 4 8.12 15.88" />
        <path d="M14.8 14.8 20 20" />
      </svg>
    </div>
  )
}

export default ServiceImage
