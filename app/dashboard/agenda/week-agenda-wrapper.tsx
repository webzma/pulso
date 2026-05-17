"use client"

import { useRouter } from "next/navigation"
import { PageHeader } from "../_components/page-header"
import { WeekView } from "./week-view"
import { ViewToggle } from "./view-toggle"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

type Appt = {
  id: string
  scheduled_at: string
  status: "pending" | "confirmed" | "completed" | "cancelled" | "no_show"
  price_usd: number | string
  client_name: string
  service_id: string
}

function startOfWeek(d: Date): Date {
  const out = new Date(d)
  out.setHours(12, 0, 0, 0)
  const diff = out.getDay() === 0 ? 6 : out.getDay() - 1
  out.setDate(out.getDate() - diff)
  return out
}
function isoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function WeekAgendaWrapper({
  date,
  appointments,
  servicesById,
}: {
  date: string
  appointments: Appt[]
  servicesById: Record<string, string>
}) {
  const router = useRouter()
  const monday = startOfWeek(new Date(`${date}T12:00:00-04:00`))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const rangeLabel = `${monday.toLocaleDateString("es-VE", { day: "numeric", month: "short" })} – ${sunday.toLocaleDateString(
    "es-VE",
    { day: "numeric", month: "short" },
  )}`

  function shift(delta: number) {
    const next = new Date(monday)
    next.setDate(monday.getDate() + delta * 7)
    router.push(`/dashboard/agenda?view=week&date=${isoDate(next)}`)
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Agenda"
        description="Vista semanal. Click en cualquier día para ver el detalle."
        actions={<ViewToggle current="week" date={date} />}
      />
      <div className="mb-4 flex items-center justify-between gap-2 rounded-xl border border-border bg-card p-1.5">
        <Button size="icon" variant="ghost" onClick={() => shift(-1)} className="size-9">
          <ChevronLeft />
        </Button>
        <p className="text-sm font-semibold tracking-tight">{rangeLabel}</p>
        <Button size="icon" variant="ghost" onClick={() => shift(1)} className="size-9">
          <ChevronRight />
        </Button>
      </div>
      <WeekView date={date} appointments={appointments} servicesById={servicesById} />
    </div>
  )
}
