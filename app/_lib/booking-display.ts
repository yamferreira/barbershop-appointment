import { getBookingEnd } from "./schedule"
import { formatInBarbershopTz } from "./timezone"

/**
 * Ordem de exibição dos serviços de um agendamento.
 *
 * `BookingService` não guarda a ordem em que o cliente marcou (a lista é um
 * conjunto), então a tela ordena pelo catálogo da barbearia: os serviços saem
 * na ordem definida pelo barbeiro em /admin/servicos, e o mesmo agendamento
 * sempre aparece igual em todas as telas.
 */
export const serviceDisplayOrder = {
  orderBy: { service: { position: "asc" } },
} as const

/**
 * Nomes dos serviços numa linha só: "Corte de Cabelo + Barba".
 *
 * Um agendamento pode ter vários serviços, então mostrar só o primeiro
 * subnotifica o que o cliente marcou.
 */
export const formatServiceNames = (services: { service: { name: string } }[]) =>
  services.map(({ service }) => service.name).join(" + ")

/**
 * Fim do agendamento em "HH:mm" de São Paulo, para exibir junto do início.
 *
 * Com vários serviços o horário de início sozinho engana: 09:00 pode terminar
 * 09:30 ou 11:00 dependendo do que foi marcado.
 */
export const formatBookingEnd = (date: Date, durationMinutes: number) =>
  formatInBarbershopTz(getBookingEnd(date, durationMinutes), "HH:mm")
