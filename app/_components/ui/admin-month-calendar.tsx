"use client"

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { ptBR } from "date-fns/locale"
import {
  addMonths,
  eachDayOfInterval,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfToday,
  startOfWeek,
  subMonths,
} from "date-fns"
import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { getMonthBookingCounts } from "@/app/admin/agendamentos/actions"
import { getMonthGridRange } from "@/app/_lib/calendar-grid"
import { cn } from "@/app/_lib/utils"

interface AdminMonthCalendarProps {
  selectedDate: Date
  initialMonthCounts: Record<string, number>
}

const capitalize = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1)

const AdminMonthCalendar = ({
  selectedDate,
  initialMonthCounts,
}: AdminMonthCalendarProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const [visibleMonth, setVisibleMonth] = useState(() =>
    startOfMonth(selectedDate),
  )
  const [monthCounts, setMonthCounts] =
    useState<Record<string, number>>(initialMonthCounts)
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    const { start, end } = getMonthGridRange(visibleMonth)
    getMonthBookingCounts({ from: start, to: end }).then(setMonthCounts)
  }, [visibleMonth])

  const weekdayLabels = eachDayOfInterval({
    start: startOfWeek(new Date(), { locale: ptBR }),
    end: endOfWeek(new Date(), { locale: ptBR }),
  }).map((day) => capitalize(format(day, "EEEEE", { locale: ptBR })))

  const { start: gridStart, end: gridEnd } = getMonthGridRange(visibleMonth)
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

  const handleDayClick = (day: Date) => {
    if (!isSameMonth(day, visibleMonth)) setVisibleMonth(startOfMonth(day))
    router.push(`${pathname}?data=${format(day, "yyyy-MM-dd")}`)
    requestAnimationFrame(() => {
      document
        .getElementById("agendamentos-do-dia")
        ?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }

  return (
    <div className="select-none">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-base font-semibold tracking-tight">
          {capitalize(format(visibleMonth, "LLLL 'de' yyyy", { locale: ptBR }))}
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Mês anterior"
            onClick={() => setVisibleMonth((month) => subMonths(month, 1))}
            className="text-foreground/70 hover:bg-brand/10 hover:text-brand flex h-8 w-8 items-center justify-center rounded-full transition-colors"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Próximo mês"
            onClick={() => setVisibleMonth((month) => addMonths(month, 1))}
            className="text-foreground/70 hover:bg-brand/10 hover:text-brand flex h-8 w-8 items-center justify-center rounded-full transition-colors"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7">
        {weekdayLabels.map((label, index) => (
          <div
            key={index}
            className="text-muted-foreground pb-2 text-center text-[11px] font-semibold tracking-wider uppercase"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {days.map((day) => {
          const isOutside = !isSameMonth(day, visibleMonth)
          const isSelected = isSameDay(day, selectedDate)
          const isCurrentDay = isToday(day)
          // Só marca como "passado" dias dentro do mês visível e que não
          // estejam selecionados — selecionar um dia antigo pra ver o
          // histórico continua mostrando ele em destaque normal.
          const isPastDay =
            !isOutside && !isSelected && isBefore(day, startOfToday())
          const count = monthCounts[format(day, "yyyy-MM-dd")] ?? 0

          return (
            <div
              key={day.toISOString()}
              className="flex items-center justify-center py-0.5"
            >
              <button
                type="button"
                aria-current={isCurrentDay ? "date" : undefined}
                aria-pressed={isSelected}
                aria-label={format(day, "d 'de' MMMM", { locale: ptBR })}
                onClick={() => handleDayClick(day)}
                className={cn(
                  "relative flex aspect-square w-9 items-center justify-center rounded-full text-sm font-medium tabular-nums transition-all duration-150",
                  isOutside && "text-muted-foreground/40",
                  !isOutside && !isSelected && !isPastDay && "text-foreground",
                  isPastDay && "text-muted-foreground/50",
                  isCurrentDay && !isSelected && "text-brand font-semibold",
                  !isSelected &&
                    !isPastDay &&
                    "hover:bg-brand/10 hover:text-brand active:scale-90",
                  isPastDay && "hover:bg-muted-foreground/10 active:scale-90",
                  isSelected &&
                    "bg-brand text-brand-foreground shadow-brand/30 shadow-md",
                )}
              >
                {format(day, "d")}
                {isCurrentDay && !isSelected && (
                  <span className="bg-brand absolute bottom-1 h-1 w-1 rounded-full" />
                )}
                {count > 0 && (
                  <span
                    className={cn(
                      "absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold",
                      isSelected
                        ? "bg-background text-brand border-brand border"
                        : "bg-brand text-brand-foreground",
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default AdminMonthCalendar
