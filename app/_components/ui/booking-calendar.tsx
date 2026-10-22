"use client"

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { ptBR } from "date-fns/locale"
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
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
import { useState } from "react"
import { cn } from "@/app/_lib/utils"

interface BookingCalendarProps {
  selected?: Date
  onSelect: (date: Date) => void
  disabled?: (date: Date) => boolean
}

const capitalize = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1)

const BookingCalendar = ({
  selected,
  onSelect,
  disabled,
}: BookingCalendarProps) => {
  const [visibleMonth, setVisibleMonth] = useState(() =>
    startOfMonth(selected ?? startOfToday()),
  )

  const weekdayLabels = eachDayOfInterval({
    start: startOfWeek(new Date(), { locale: ptBR }),
    end: endOfWeek(new Date(), { locale: ptBR }),
  }).map((day) => capitalize(format(day, "EEEEE", { locale: ptBR })))

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(visibleMonth), { locale: ptBR }),
    end: endOfWeek(endOfMonth(visibleMonth), { locale: ptBR }),
  })

  const isPastMonth = isBefore(visibleMonth, startOfMonth(startOfToday()))
  const canGoToPreviousMonth = !isPastMonth

  const handleDayClick = (day: Date) => {
    if (disabled?.(day)) return
    if (!isSameMonth(day, visibleMonth)) setVisibleMonth(startOfMonth(day))
    onSelect(day)
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
            disabled={!canGoToPreviousMonth}
            onClick={() => setVisibleMonth((month) => subMonths(month, 1))}
            className="text-foreground/70 hover:bg-brand/10 hover:text-brand flex h-8 w-8 items-center justify-center rounded-full transition-colors disabled:pointer-events-none disabled:opacity-30"
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
          const isSelected = selected && isSameDay(day, selected)
          const isDisabled = disabled?.(day) ?? false
          const isCurrentDay = isToday(day)

          return (
            <div
              key={day.toISOString()}
              className="flex items-center justify-center py-0.5"
            >
              <button
                type="button"
                disabled={isDisabled}
                aria-current={isCurrentDay ? "date" : undefined}
                aria-pressed={isSelected}
                aria-label={format(day, "d 'de' MMMM", { locale: ptBR })}
                onClick={() => handleDayClick(day)}
                className={cn(
                  "relative flex aspect-square w-9 items-center justify-center rounded-full text-sm font-medium tabular-nums transition-all duration-150",
                  isOutside && "text-muted-foreground/40",
                  !isOutside && !isSelected && "text-foreground",
                  isCurrentDay &&
                    !isSelected &&
                    "font-semibold text-[var(--brand-gold-text)]",
                  !isDisabled &&
                    !isSelected &&
                    "hover:bg-brand/10 hover:text-[var(--brand-gold-text)] active:scale-90",
                  isSelected &&
                    "bg-brand text-brand-foreground shadow-brand/30 shadow-md",
                  isDisabled &&
                    "text-muted-foreground/30 pointer-events-none line-through decoration-1",
                )}
              >
                {format(day, "d")}
                {isCurrentDay && !isSelected && (
                  <span className="bg-brand absolute bottom-1 h-1 w-1 rounded-full" />
                )}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default BookingCalendar
