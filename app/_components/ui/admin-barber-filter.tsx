import Link from "next/link"
import { cn } from "@/app/_lib/utils"

interface AdminBarberFilterProps {
  barbers: { id: string; name: string }[]
  /** Barbeiro selecionado; `undefined` significa "Todos". */
  selectedBarberId?: string
  basePath: string
  /** Outros parâmetros da URL a preservar ao trocar de barbeiro (ex.: `data`). */
  params?: Record<string, string | undefined>
}

const AdminBarberFilter = ({
  barbers,
  selectedBarberId,
  basePath,
  params = {},
}: AdminBarberFilterProps) => {
  const hrefFor = (barberId?: string) => {
    const search = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      if (value) search.set(key, value)
    }
    if (barberId) search.set("barbeiro", barberId)
    const query = search.toString()
    return query ? `${basePath}?${query}` : basePath
  }

  const options = [
    { id: undefined, name: "Todos" },
    ...barbers.map((barber) => ({ id: barber.id, name: barber.name })),
  ]

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Barbeiro">
      {options.map((option) => {
        const isSelected = option.id === selectedBarberId
        return (
          <Link
            key={option.id ?? "todos"}
            href={hrefFor(option.id)}
            aria-current={isSelected ? "true" : undefined}
            className={cn(
              "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
              isSelected
                ? "bg-brand text-brand-foreground border-transparent"
                : "text-foreground/70 hover:bg-brand/10 hover:text-brand",
            )}
          >
            {option.name}
          </Link>
        )
      })}
    </div>
  )
}

export default AdminBarberFilter
