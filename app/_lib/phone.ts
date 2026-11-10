/**
 * Telefone brasileiro (DDD + número), compartilhado entre client e servidor.
 *
 * Sem acesso a banco aqui de propósito: o booking-flow importa este arquivo
 * para a máscara e para habilitar o Confirmar, e o createBooking importa o
 * mesmo `isValidPhone` para a validação que vale. Uma regra só, nos dois lados.
 *
 * Formato guardado: só dígitos, sem o 55 do país ("11912345678").
 */

/** Só os dígitos. Um +55 colado na frente (12 ou 13 dígitos) é descartado. */
export const normalizePhone = (input: string) => {
  const digits = input.replace(/\D/g, "")
  if (digits.length > 11 && digits.startsWith("55")) return digits.slice(2)
  return digits
}

/**
 * 10 dígitos (fixo) ou 11 (celular), DDD de 11 a 99 e, no celular, o número
 * começando com 9 logo depois do DDD.
 */
export const isValidPhone = (digits: string) => {
  if (!/^\d{10,11}$/.test(digits)) return false
  const ddd = Number(digits.slice(0, 2))
  if (ddd < 11 || ddd > 99) return false
  if (digits.length === 11 && digits[2] !== "9") return false
  return true
}

/**
 * Máscara progressiva para o campo: "(11) 91234-5678" ou "(11) 1234-5678"
 * conforme o usuário digita. Corta no 11º dígito.
 */
export const maskPhone = (input: string) => {
  const d = normalizePhone(input).slice(0, 11)
  if (d.length === 0) return ""
  if (d.length <= 2) return `(${d}`
  const ddd = d.slice(0, 2)
  const rest = d.slice(2)
  // Com 11 dígitos o hífen fica depois do 5º do número; com até 10, do 4º.
  const split = d.length === 11 ? 5 : 4
  if (rest.length <= split) return `(${ddd}) ${rest}`
  return `(${ddd}) ${rest.slice(0, split)}-${rest.slice(split)}`
}

/** Telefone guardado → "(11) 91234-5678". Valor fora do padrão sai como veio. */
export const formatPhone = (stored: string) => {
  const digits = normalizePhone(stored)
  return isValidPhone(digits) ? maskPhone(digits) : stored
}

export const phoneTelHref = (digits: string) => `tel:+55${digits}`

export const phoneWhatsAppUrl = (digits: string) => `https://wa.me/55${digits}`
