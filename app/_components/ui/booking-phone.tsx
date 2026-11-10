import { MessageCircleIcon, PhoneIcon } from "lucide-react"
import {
  formatPhone,
  isValidPhone,
  normalizePhone,
  phoneTelHref,
  phoneWhatsAppUrl,
} from "@/app/_lib/phone"
import { cn } from "@/app/_lib/utils"

interface BookingPhoneProps {
  /** `Booking.guestPhone` (nome histórico: vale para todo agendamento). */
  phone: string | null
  className?: string
}

/**
 * Telefone do agendamento para o barbeiro: número formatado com link `tel:`
 * e atalho para o WhatsApp. Agendamento antigo sem telefone mostra "Sem
 * telefone". Sem hooks, então serve em server e client components (lista do
 * admin e aviso de bloqueio).
 *
 * Sem cor fixa nos links: a lista do admin é clara (`.theme-nobre`) e o
 * diálogo de bloqueio é escuro (fica fora do escopo da marca), e herdar a cor
 * do texto mantém o contraste nos dois.
 */
const BookingPhone = ({ phone, className }: BookingPhoneProps) => {
  const digits = phone ? normalizePhone(phone) : ""

  if (!phone || !digits) {
    return (
      <p className={cn("text-muted-foreground text-sm", className)}>
        Sem telefone
      </p>
    )
  }

  // Número gravado fora do padrão (dado antigo) ainda aparece e liga, mas sem
  // WhatsApp: wa.me com número errado abre conversa com outra pessoa.
  const valid = isValidPhone(digits)

  return (
    <div
      className={cn("flex flex-wrap items-center gap-x-3 gap-y-1", className)}
    >
      <a
        href={phoneTelHref(digits)}
        className="inline-flex items-center gap-1 text-sm font-medium underline-offset-2 hover:underline"
      >
        <PhoneIcon className="size-3.5" aria-hidden="true" />
        {formatPhone(phone)}
      </a>
      {valid && (
        <a
          href={phoneWhatsAppUrl(digits)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-medium underline-offset-2 hover:underline"
          aria-label={`Abrir conversa no WhatsApp com ${formatPhone(phone)}`}
        >
          <MessageCircleIcon className="size-3.5" aria-hidden="true" />
          WhatsApp
        </a>
      )}
    </div>
  )
}

export default BookingPhone
