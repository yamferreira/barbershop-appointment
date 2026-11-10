"use client"

import { CheckIcon, CopyIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "./button"

interface CopyButtonProps {
  value: string
  /** Nome acessível do botão, ex.: "Copiar link https do Luiz". */
  label: string
}

const CopyButton = ({ value, label }: CopyButtonProps) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      toast.success("Link copiado!")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Sem permissão de área de transferência (ou contexto não seguro):
      // o link continua visível no campo para copiar à mão.
      toast.error("Não deu para copiar. Selecione o link e copie à mão.")
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={handleCopy}
      aria-label={label}
      className="shrink-0 gap-1"
    >
      {copied ? (
        <CheckIcon className="size-4" aria-hidden="true" />
      ) : (
        <CopyIcon className="size-4" aria-hidden="true" />
      )}
      {copied ? "Copiado" : "Copiar"}
    </Button>
  )
}

export default CopyButton
