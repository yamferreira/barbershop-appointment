import { headers } from "next/headers"
import { ShieldAlertIcon } from "lucide-react"
import { calendarFeedPath } from "@/app/_lib/calendar-token"
import { db } from "@/app/_lib/prisma"
import CopyButton from "@/app/_components/ui/copy-button"
import RegenerateCalendarLinkButton from "@/app/_components/ui/regenerate-calendar-link-button"

// O token pode mudar a qualquer momento ("Gerar novo link"); nada de cache.
export const dynamic = "force-dynamic"

/**
 * Origem pública do site, a partir do pedido. Na Vercel (e atrás de proxy) o
 * host real vem em `x-forwarded-host`; localmente é o `host`. Sem proxy e em
 * localhost o protocolo é http.
 */
const getOrigin = async () => {
  const h = await headers()
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000"
  const proto =
    h.get("x-forwarded-proto") ??
    (/^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? "http" : "https")
  return { host, proto }
}

/**
 * Links de assinatura do calendário de cada barbeiro ativo. Protegida pelo
 * layout de /admin (`requireBarbeiro`). É a ÚNICA tela que mostra o
 * `calendarToken`: a consulta abaixo é a única fora do feed que o seleciona.
 */
const AdminCalendarioPage = async () => {
  const [barbers, { host, proto }] = await Promise.all([
    db.barber.findMany({
      where: { active: true },
      select: { id: true, name: true, calendarToken: true },
      orderBy: [{ createdAt: "asc" }, { name: "asc" }],
    }),
    getOrigin(),
  ])

  return (
    <div className="space-y-6 p-5">
      <div className="space-y-1">
        <h1 className="text-xl font-bold">Calendário</h1>
        <p className="text-muted-foreground text-sm">
          Assine a agenda no Google Agenda ou no iPhone e veja os agendamentos
          junto com os seus compromissos.
        </p>
      </div>

      <div
        role="note"
        className="flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
      >
        <ShieldAlertIcon
          className="mt-0.5 size-4 shrink-0"
          aria-hidden="true"
        />
        <p>
          <strong>Não compartilhe estes links.</strong> Quem tiver o link vê os
          nomes e telefones dos clientes. Se um link vazar, use “Gerar novo
          link”: o antigo para de funcionar na hora.
        </p>
      </div>

      {barbers.length === 0 && (
        <p className="text-muted-foreground text-sm">Nenhum barbeiro ativo.</p>
      )}

      {barbers.map((barber) => {
        const path = calendarFeedPath(barber.calendarToken)
        const httpsUrl = `${proto}://${host}${path}`
        const webcalUrl = `webcal://${host}${path}`
        return (
          <section
            key={barber.id}
            aria-labelledby={`cal-${barber.id}`}
            className="bg-card space-y-3 rounded-lg border p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 id={`cal-${barber.id}`} className="font-semibold">
                {barber.name}
              </h2>
              <RegenerateCalendarLinkButton
                barberId={barber.id}
                barberName={barber.name}
              />
            </div>

            {[
              { label: "webcal://", hint: "iPhone, Mac", url: webcalUrl },
              { label: "https://", hint: "Google Agenda", url: httpsUrl },
            ].map(({ label, hint, url }) => (
              <div key={label} className="space-y-1">
                <p className="text-muted-foreground text-xs">
                  <span className="font-semibold">{label}</span> · {hint}
                </p>
                <div className="flex items-center gap-2">
                  <a
                    href={url}
                    className="bg-background min-w-0 flex-1 truncate rounded-md border px-3 py-2 font-mono text-xs underline-offset-2 hover:underline"
                    rel="noreferrer"
                  >
                    {url}
                  </a>
                  <CopyButton
                    value={url}
                    label={`Copiar link ${label} do ${barber.name}`}
                  />
                </div>
              </div>
            ))}
          </section>
        )
      })}

      <section className="space-y-3 text-sm">
        <h2 className="text-muted-foreground text-xs font-bold uppercase">
          Como assinar
        </h2>
        <div className="space-y-1">
          <h3 className="font-semibold">Google Agenda (pelo computador)</h3>
          <p>
            Copie o link <strong>https://</strong>. No Google Agenda, ao lado de{" "}
            <strong>Outras agendas</strong> (ou “Outros calendários”), clique em{" "}
            <strong>+</strong> → <strong>Do URL</strong> (ou “Por URL”), cole o
            link e confirme. Depois disso a agenda aparece também no celular.
          </p>
        </div>
        <div className="space-y-1">
          <h3 className="font-semibold">iPhone</h3>
          <p>
            Copie o link <strong>webcal://</strong>. Abra{" "}
            <strong>
              Ajustes → Calendário → Contas → Adicionar conta → Outra →
              Adicionar calendário assinado
            </strong>
            , cole o link e salve (no iOS 18 o caminho começa em Ajustes → Apps
            → Calendário). Ou toque no link webcal:// direto no iPhone.
          </p>
        </div>
        <p className="text-muted-foreground">
          A sincronização é só de ida: mudar o evento no calendário não altera o
          agendamento. O iPhone atualiza mais ou menos de hora em hora; o Google
          pode levar algumas horas para mostrar mudanças.
        </p>
      </section>
    </div>
  )
}

export default AdminCalendarioPage
