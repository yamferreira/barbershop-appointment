/**
 * Geração de iCalendar (RFC 5545) para o feed da agenda do barbeiro.
 *
 * Sem dependência externa: o formato que o feed usa é pequeno e as regras que
 * importam estão todas aqui —
 * - linhas terminadas em CRLF (§3.1);
 * - linhas com mais de 75 octetos dobradas: quebra CRLF seguida de um espaço,
 *   sem partir um caractere UTF-8 de vários bytes no meio (§3.1);
 * - valores TEXT com `\`, `;`, `,` e quebras de linha escapados (§3.3.11), e
 *   sem caracteres de controle, que o TEXT não admite;
 * - datas em UTC, no formato `AAAAMMDDTHHMMSSZ` (§3.3.5).
 */

const CRLF = "\r\n"
const MAX_OCTETS = 75

/**
 * Escapa um valor TEXT. Quebras de linha viram o literal `\n` (é como o
 * iCalendar representa uma quebra dentro do valor); qualquer outro caractere
 * de controle, e os separadores de linha/parágrafo do Unicode, viram espaço.
 * Nome de cliente vem de fora (Google ou formulário), então isto é o que
 * impede um nome de injetar uma linha nova no feed.
 */
export const escapeText = (value: string) =>
  value
    .replace(/\r\n|\r|\n/g, "\n")
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f\u2028\u2029]/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\t/g, " ")
    .replace(/\n/g, "\\n")

/**
 * Dobra uma linha de conteúdo em pedaços de no máximo 75 octetos. A primeira
 * linha leva até 75; as de continuação começam com um espaço, que conta nos
 * 75. Percorre por code point para nunca separar os bytes de um caractere.
 */
export const foldLine = (line: string) => {
  if (Buffer.byteLength(line, "utf8") <= MAX_OCTETS) return line

  const parts: string[] = []
  let current = ""
  let currentOctets = 0
  let limit = MAX_OCTETS

  for (const char of line) {
    const octets = Buffer.byteLength(char, "utf8")
    if (currentOctets + octets > limit) {
      parts.push(current)
      current = ""
      currentOctets = 0
      limit = MAX_OCTETS - 1 // o espaço da continuação ocupa 1 octeto
    }
    current += char
    currentOctets += octets
  }
  parts.push(current)

  return parts.join(CRLF + " ")
}

/** Data em UTC no formato DATE-TIME do iCalendar: 20261201T180000Z. */
export const formatUtc = (date: Date) =>
  date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "")

export interface IcsEvent {
  uid: string
  start: Date
  end: Date
  /** Momento em que o evento mudou pela última vez (DTSTAMP/LAST-MODIFIED). */
  updatedAt: Date
  summary: string
  description?: string
}

interface IcsCalendar {
  name: string
  events: IcsEvent[]
}

export const buildCalendar = ({ name, events }: IcsCalendar) => {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Nobre Barbearia//Agenda do barbeiro//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(name)}`,
    // Sugestão de intervalo de atualização. O Apple Calendar respeita; o
    // Google Agenda ignora e atualiza no ritmo dele (pode levar horas).
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ]

  for (const event of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${escapeText(event.uid)}`,
      `DTSTAMP:${formatUtc(event.updatedAt)}`,
      `LAST-MODIFIED:${formatUtc(event.updatedAt)}`,
      `DTSTART:${formatUtc(event.start)}`,
      `DTEND:${formatUtc(event.end)}`,
      `SUMMARY:${escapeText(event.summary)}`,
      ...(event.description
        ? [`DESCRIPTION:${escapeText(event.description)}`]
        : []),
      "STATUS:CONFIRMED",
      "TRANSP:OPAQUE",
      "END:VEVENT",
    )
  }

  lines.push("END:VCALENDAR")

  // CRLF depois de CADA linha, inclusive a última (§3.1).
  return lines.map(foldLine).join(CRLF) + CRLF
}
