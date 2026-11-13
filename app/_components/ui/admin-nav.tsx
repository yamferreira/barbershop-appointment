"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  CalendarOffIcon,
  CalendarRangeIcon,
  LayoutDashboardIcon,
  ScissorsIcon,
} from "lucide-react"
import { cn } from "@/app/_lib/utils"

const items = [
  { href: "/admin", label: "Painel", icon: LayoutDashboardIcon },
  {
    href: "/admin/agendamentos",
    label: "Agendamentos",
    icon: CalendarDaysIcon,
  },
  { href: "/admin/bloqueios", label: "Bloqueios", icon: CalendarOffIcon },
  { href: "/admin/calendario", label: "Calendário", icon: CalendarRangeIcon },
  { href: "/admin/servicos", label: "Serviços", icon: ScissorsIcon },
]

/**
 * "/admin" só fica ativo nele mesmo (senão estaria ativo em todas as páginas);
 * as outras seções valem também para subcaminhos.
 */
const isActive = (pathname: string, href: string) =>
  href === "/admin"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`)

/**
 * Cabeçalho e navegação de /admin, no verde da marca como o header do site.
 *
 * No celular as cinco seções ficam numa linha de abas de largura igual, com o
 * ícone em cima do texto; a partir de `sm` o ícone vai para o lado. "Voltar ao
 * site" fica na linha do logo, separado das seções.
 */
const AdminNav = () => {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-40 bg-[var(--brand-forest)] text-[var(--brand-cream)]">
      <div className="flex items-center justify-between gap-3 px-4 pt-2">
        <Link
          href="/admin"
          className="flex items-center gap-2"
          aria-label="Nobre · Painel do barbeiro"
        >
          <span className="flex items-center gap-1">
            <Image
              src="/brand/nobre-crown.png"
              height={16}
              width={27}
              alt=""
              className="h-[16px] w-[27px]"
              priority
            />
            <Image
              src="/brand/nobre-wordmark.png"
              height={18}
              width={89}
              alt=""
              className="h-[18px] w-[89px]"
              priority
            />
          </span>
          <span className="hidden text-xs font-medium text-[var(--brand-cream)]/60 sm:inline">
            Painel do barbeiro
          </span>
        </Link>

        <Link
          href="/"
          className="flex items-center gap-1 rounded-md px-2 py-2 text-xs font-medium text-[var(--brand-cream)]/80 transition-colors hover:bg-white/10 hover:text-[var(--brand-cream)] focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)] focus-visible:outline-none sm:text-sm"
        >
          <ArrowLeftIcon className="size-4" aria-hidden="true" />
          Voltar ao site
        </Link>
      </div>

      <nav aria-label="Seções do painel">
        <ul className="grid grid-cols-5 px-2 sm:flex sm:gap-1 sm:px-4">
          {items.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href)
            return (
              <li key={href} className="min-w-0">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-12 flex-col items-center justify-center gap-1 border-b-2 px-1 pt-1.5 pb-2 text-[11px] font-medium transition-colors focus-visible:bg-white/10 focus-visible:outline-none sm:flex-row sm:gap-2 sm:px-3 sm:text-sm",
                    active
                      ? "border-[var(--brand-gold)] text-[var(--brand-gold)]"
                      : "border-transparent text-[var(--brand-cream)]/70 hover:text-[var(--brand-cream)]",
                  )}
                >
                  <Icon className="size-[18px] shrink-0" aria-hidden="true" />
                  <span className="max-w-full truncate">{label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </header>
  )
}

export default AdminNav
