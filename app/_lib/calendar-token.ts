import { randomBytes } from "crypto"

/**
 * `Barber.calendarToken`: 32 bytes aleatórios em hex (64 caracteres). É a
 * única credencial do feed de calendário, então só aparece na URL do feed e na
 * página /admin/calendario — nunca em `select`/`include` que chegue ao client
 * por outro caminho.
 */
export const generateCalendarToken = () => randomBytes(32).toString("hex")

export const CALENDAR_TOKEN_PATTERN = /^[0-9a-f]{64}$/

export const calendarFeedPath = (token: string) => `/api/calendar/${token}.ics`
