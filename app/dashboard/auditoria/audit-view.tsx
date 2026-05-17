"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { History, CalendarClock, Percent, Wallet, Pencil, X, AlertOctagon } from "lucide-react"
import { formatUsd } from "@/lib/exchange-rate"
import { cn } from "@/lib/utils"

type Entry = {
  id: string
  actor_user_id: string | null
  entity_kind: "appointment" | "commission" | "service" | "membership"
  entity_id: string
  action: string
  details: Record<string, any>
  created_at: string
}

const ACTION_LABEL: Record<string, string> = {
  cancelled: "Cancelada",
  no_show: "No asistió",
  rescheduled: "Reagendada",
  price_changed: "Precio cambiado",
  commission_paid: "Comisión pagada",
  commission_unpaid: "Comisión des-marcada",
  amount_changed: "Monto cambiado",
}

const ACTION_TONE: Record<string, "destructive" | "warning" | "default"> = {
  cancelled: "destructive",
  no_show: "destructive",
  rescheduled: "warning",
  price_changed: "warning",
  commission_paid: "default",
  commission_unpaid: "warning",
  amount_changed: "warning",
}

const ACTION_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  cancelled: X,
  no_show: AlertOctagon,
  rescheduled: CalendarClock,
  price_changed: Pencil,
  commission_paid: Wallet,
  commission_unpaid: Wallet,
  amount_changed: Percent,
}

export function AuditView({
  entries,
  kindFilter,
  actionFilter,
}: {
  entries: Entry[]
  kindFilter: string
  actionFilter: string
}) {
  const router = useRouter()

  function update(patch: { kind?: string; action?: string }) {
    const params = new URLSearchParams()
    const nextKind = patch.kind ?? kindFilter
    const nextAction = patch.action ?? actionFilter
    if (nextKind !== "all") params.set("kind", nextKind)
    if (nextAction !== "all") params.set("action", nextAction)
    router.push(`/dashboard/auditoria${params.toString() ? `?${params.toString()}` : ""}`)
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2">
        <Select value={kindFilter} onValueChange={(v) => update({ kind: v })}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las entidades</SelectItem>
            <SelectItem value="appointment">Citas</SelectItem>
            <SelectItem value="commission">Comisiones</SelectItem>
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={(v) => update({ action: v })}>
          <SelectTrigger className="w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las acciones</SelectItem>
            <SelectItem value="cancelled">Canceladas</SelectItem>
            <SelectItem value="no_show">No asistió</SelectItem>
            <SelectItem value="rescheduled">Reagendadas</SelectItem>
            <SelectItem value="price_changed">Precio cambiado</SelectItem>
            <SelectItem value="commission_paid">Comisión pagada</SelectItem>
            <SelectItem value="commission_unpaid">Comisión des-marcada</SelectItem>
            <SelectItem value="amount_changed">Monto cambiado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {entries.length === 0 ? (
        <Empty className="border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <History />
            </EmptyMedia>
            <EmptyTitle>Sin eventos registrados</EmptyTitle>
            <EmptyDescription>
              Aquí aparecerán las acciones sensibles (cancelaciones, ediciones de precio, pagos de comisión).
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="grid gap-2">
          {entries.map((e) => (
            <li key={e.id}>
              <AuditCard entry={e} />
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function AuditCard({ entry }: { entry: Entry }) {
  const Icon = ACTION_ICON[entry.action] ?? History
  const tone = ACTION_TONE[entry.action] ?? "default"
  const when = new Date(entry.created_at).toLocaleString("es-VE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Caracas",
  })

  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-3">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg",
            tone === "destructive" && "bg-destructive/10 text-destructive",
            tone === "warning" && "bg-amber-500/15 text-amber-700 dark:text-amber-300",
            tone === "default" && "bg-secondary text-foreground",
          )}
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <p className="text-sm font-semibold tracking-tight">
              {ACTION_LABEL[entry.action] ?? entry.action}
            </p>
            <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
              {entry.entity_kind === "appointment" ? "Cita" : entry.entity_kind === "commission" ? "Comisión" : entry.entity_kind}
            </Badge>
            <span className="text-[11px] text-muted-foreground">{when}</span>
          </div>
          <AuditDetail entry={entry} />
        </div>
      </CardContent>
    </Card>
  )
}

function AuditDetail({ entry }: { entry: Entry }) {
  const d = entry.details ?? {}
  if (entry.entity_kind === "appointment") {
    return (
      <p className="mt-0.5 text-xs text-muted-foreground">
        {d.client_name && <span className="font-medium text-foreground">{d.client_name}</span>}
        {entry.action === "rescheduled" && d.from && d.to && (
          <span>
            {" "}
            · {timeShort(d.from)} → <span className="font-mono">{timeShort(d.to)}</span>
          </span>
        )}
        {entry.action === "price_changed" && (
          <span>
            {" "}
            · {formatUsd(Number(d.from ?? 0))} → <span className="font-mono">{formatUsd(Number(d.to ?? 0))}</span>
          </span>
        )}
        {entry.action === "cancelled" && d.scheduled_at && <span> · {timeShort(d.scheduled_at)}</span>}
        {entry.action === "no_show" && d.scheduled_at && <span> · {timeShort(d.scheduled_at)}</span>}
        <Link
          href={`/dashboard/agenda?date=${(d.scheduled_at ?? d.to ?? entry.created_at).slice(0, 10)}`}
          className="ml-1 underline-offset-4 hover:underline"
        >
          ver agenda
        </Link>
      </p>
    )
  }
  if (entry.entity_kind === "commission") {
    return (
      <p className="mt-0.5 text-xs text-muted-foreground">
        {entry.action === "amount_changed" ? (
          <>
            {formatUsd(Number(d.from ?? 0))} → <span className="font-mono">{formatUsd(Number(d.to ?? 0))}</span>
          </>
        ) : (
          <>Monto: {formatUsd(Number(d.amount_usd ?? 0))}</>
        )}
      </p>
    )
  }
  return null
}

function timeShort(iso: string) {
  return new Date(iso).toLocaleString("es-VE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Caracas",
  })
}
