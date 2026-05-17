"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronRight } from "lucide-react"
import { formatUsd } from "@/lib/exchange-rate"
import { cn } from "@/lib/utils"

type Appt = {
  id: string
  scheduled_at: string
  status: "pending" | "confirmed" | "completed" | "cancelled" | "no_show"
  price_usd: number | string
  client_name: string
  service_id: string
}

const DAY_NAMES = ["DOM", "LUN", "MAR", "MIE", "JUE", "VIE", "SAB"]

function isoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function startOfWeek(d: Date): Date {
  const out = new Date(d)
  out.setHours(0, 0, 0, 0)
  // Monday-start week (Caracas convention): if Sun (0) → go back 6, else go back day-1
  const diff = out.getDay() === 0 ? 6 : out.getDay() - 1
  out.setDate(out.getDate() - diff)
  return out
}

export function WeekView({
  date,
  appointments,
  servicesById,
}: {
  date: string
  appointments: Appt[]
  servicesById: Record<string, string>
}) {
  const anchor = new Date(`${date}T12:00:00-04:00`)
  const monday = startOfWeek(anchor)
  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    days.push(d)
  }

  // Group appointments by Caracas day key
  const byDay = new Map<string, Appt[]>()
  for (const a of appointments) {
    const k = new Date(a.scheduled_at).toLocaleDateString("en-CA", { timeZone: "America/Caracas" })
    const arr = byDay.get(k) ?? []
    arr.push(a)
    byDay.set(k, arr)
  }

  const todayKey = isoDate(new Date())

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
      {days.map((d) => {
        const key = isoDate(d)
        const items = (byDay.get(key) ?? [])
          .slice()
          .sort((x, y) => x.scheduled_at.localeCompare(y.scheduled_at))
        const visible = items.filter((a) => a.status !== "cancelled" && a.status !== "no_show")
        const revenue = items
          .filter((a) => a.status === "completed")
          .reduce((s, a) => s + Number(a.price_usd), 0)
        const isToday = key === todayKey
        return (
          <Link key={key} href={`/dashboard/agenda?date=${key}`} className="lg:col-span-1">
            <Card
              className={cn(
                "h-full transition-colors hover:border-foreground/30",
                isToday && "border-accent/60 bg-accent/5",
              )}
            >
              <CardContent className="flex h-full flex-col gap-2 p-3">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      {DAY_NAMES[d.getDay()]}
                    </p>
                    <p className="font-mono text-lg font-bold leading-none tabular-nums">{d.getDate()}</p>
                  </div>
                  {isToday && (
                    <Badge variant="outline" className="border-accent/40 bg-accent/15 text-[10px] uppercase">
                      hoy
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between gap-1 border-y border-border/60 py-1.5 text-[11px] text-muted-foreground">
                  <span>
                    <span className="font-mono font-semibold text-foreground">{visible.length}</span> cita
                    {visible.length === 1 ? "" : "s"}
                  </span>
                  {revenue > 0 && (
                    <span className="font-mono font-semibold text-foreground">{formatUsd(revenue)}</span>
                  )}
                </div>
                {items.length === 0 ? (
                  <p className="flex-1 py-2 text-[11px] text-muted-foreground">Sin citas</p>
                ) : (
                  <ul className="flex-1 space-y-1">
                    {items.slice(0, 3).map((a) => {
                      const time = new Date(a.scheduled_at).toLocaleTimeString("es-VE", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                        timeZone: "America/Caracas",
                      })
                      return (
                        <li
                          key={a.id}
                          className={cn(
                            "flex items-baseline gap-1.5 truncate text-[11px]",
                            (a.status === "cancelled" || a.status === "no_show") && "line-through opacity-50",
                          )}
                        >
                          <span className="font-mono tabular-nums text-muted-foreground">{time}</span>
                          <span className="truncate">{a.client_name}</span>
                        </li>
                      )
                    })}
                    {items.length > 3 && (
                      <li className="text-[10px] text-muted-foreground">+{items.length - 3} más</li>
                    )}
                  </ul>
                )}
                <div className="mt-auto pt-1 text-[10px] text-muted-foreground">
                  <span className="inline-flex items-center gap-0.5">
                    Ver día <ChevronRight className="size-3" />
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
