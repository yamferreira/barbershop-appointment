export const GUEST_NAME_MAX_LENGTH = 80

const graphemes = new Intl.Segmenter("pt-BR", { granularity: "grapheme" })

/**
 * Nome de quem agenda sem login, como vai para o banco.
 *
 * O nome vem do formulário, mas acaba no admin e no feed de calendário (.ics)
 * dos barbeiros, então:
 * - caracteres de controle (inclui quebras de linha e tab) e separadores de
 *   linha/parágrafo do Unicode viram espaço: um nome não pode abrir linha nova
 *   no feed nem quebrar o layout;
 * - espaços repetidos viram um e as pontas são aparadas;
 * - no máximo 80 caracteres, contados como o usuário enxerga (grafemas), para
 *   não cortar um emoji ou um acento combinado no meio.
 *
 * Valor que não é string, ou que fica vazio depois da limpeza, vira "".
 */
export const sanitizeGuestName = (input: unknown) => {
  if (typeof input !== "string") return ""

  const cleaned = input
    .replace(/[\p{Cc}\p{Zl}\p{Zp}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()

  const parts = Array.from(graphemes.segment(cleaned), (s) => s.segment)
  if (parts.length <= GUEST_NAME_MAX_LENGTH) return cleaned
  return parts.slice(0, GUEST_NAME_MAX_LENGTH).join("").trim()
}
