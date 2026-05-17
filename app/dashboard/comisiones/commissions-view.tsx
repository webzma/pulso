"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Check, ChevronDown, Percent, Download } from "lucide-react"
import { formatUsd } from "@/lib/exchange-rate"
import { downloadCsv, toCsv } from "@/lib/csv"
import { PageHeader } from "../_components/page-header"
import { KpiCard } from "../_components/kpi-card"
import { cn } from "@/lib/utils"

type Row = {
  id: string
  amount_usd: number
  service_amount_usd: number
  commission_percentage: number
  paid: boolean
  paid_at: string | null
  created_at: string
  staff_member_id: string
  appointment_id: string
  appointments: {
    scheduled_at: string
    client_name: string
    service_id: string
    services: { name: string } | null
  }
}
type Staff = { id: string; display_name: string }

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function CommissionsView({
  userId,
  from,
  to,
  rows,
  staff,
}: {
  tenantId: string
  userId: string
  from: string
  to: string
  rows: Row[]
  staff: Staff[]
}) {
  const router = useRouter()
  const [dateFrom, setDateFrom] = useState(from)
  const [dateTo, setDateTo] = useState(to)
  const [data, setData] = useState<Row[]>(rows)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [filter, setFilter] = useState<"all" | "pending" | "paid">("pending")

  const filtered = useMemo(() => {
    if (filter === "pending") return data.filter((r) => !r.paid)
    if (filter === "paid") return data.filter((r) => r.paid)
    return data
  }, [data, filter])

  const groups = useMemo(() => {
    const byStaff = new Map<string, { staff: Staff | undefined; items: Row[]; pending: number; total: number }>()
    for (const r of filtered) {
      const s = staff.find((x) => x.id === r.staff_member_id)
      const g = byStaff.get(r.staff_member_id) ?? { staff: s, items: [] as Row[], pending: 0, total: 0 }
      g.items.push(r)
      g.total += Number(r.amount_usd)
      if (!r.paid) g.pending += Number(r.amount_usd)
      byStaff.set(r.staff_member_id, g)
    }
    return Array.from(byStaff.entries())
      .map(([id, g]) => ({ id, ...g }))
      .sort((a, b) => b.pending - a.pending)
  }, [filtered, staff])

  const totals = useMemo(() => {
    let pending = 0
    let total = 0
    for (const r of data) {
      total += Number(r.amount_usd)
      if (!r.paid) pending += Number(r.amount_usd)
    }
    return { pending, total, paid: total - pending }
  }, [data])

  const counts = useMemo(() => {
    let pending = 0
    let paid = 0
    for (const r of data) {
      if (r.paid) paid++
      else pending++
    }
    return { all: data.length, pending, paid }
  }, [data])

  function applyFilters() {
    const params = new URLSearchParams()
    params.set("from", dateFrom)
    params.set("to", dateTo)
    router.push(`/dashboard/comisiones?${params.toString()}`)
  }

  async function markPaid(staffId: string) {
    const ids = data.filter((r) => r.staff_member_id === staffId && !r.paid).map((r) => r.id)
    if (ids.length === 0) return
    if (!confirm(`Marcar ${ids.length} comisión(es) como pagadas?`)) return
    setBusy(staffId)
    const supabase = createClient()
    const { error } = await supabase
      .from("commissions")
      .update({ paid: true, paid_at: new Date().toISOString(), paid_by: userId })
      .in("id", ids)
    if (!error) {
      setData((prev) =>
        prev.map((r) => (ids.includes(r.id) ? { ...r, paid: true, paid_at: new Date().toISOString() } : r)),
      )
      router.refresh()
    } else {
      alert("No se pudo actualizar")
    }
    setBusy(null)
  }

  function exportCsv() {
    const csv = toCsv(data, [
      { key: "id", label: "ID" },
      {
        key: "created_at",
        label: "Generada",
        format: (v) => new Date(v as string).toISOString(),
      },
      {
        key: "appointment_id" as any,
        label: "Cliente",
        format: (_, row) => row.appointments?.client_name ?? "",
      },
      {
        key: "appointment_id" as any,
        label: "Servicio",
        format: (_, row) => row.appointments?.services?.name ?? "",
      },
      {
        key: "appointment_id" as any,
        label: "Cita",
        format: (_, row) => row.appointments?.scheduled_at ?? "",
      },
      {
        key: "staff_member_id" as any,
        label: "Entrenador",
        format: (_, row) => staff.find((s) => s.id === row.staff_member_id)?.display_name ?? "",
      },
      { key: "service_amount_usd", label: "Cita USD", format: (v) => Number(v).toFixed(2) },
      { key: "commission_percentage", label: "% Comisión", format: (v) => Number(v).toFixed(1) },
      { key: "amount_usd", label: "Monto USD", format: (v) => Number(v).toFixed(2) },
      { key: "paid", label: "Pagada", format: (v) => (v ? "Sí" : "No") },
      {
        key: "paid_at",
        label: "Pagada en",
        format: (v) => (v ? new Date(v as string).toISOString() : ""),
      },
    ])
    downloadCsv(`comisiones_${from}_${to}.csv`, csv)
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Comisiones"
        description="Cuánto le debes a cada miembro del equipo por las citas que han completado en el rango seleccionado."
        actions={
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={data.length === 0}>
            <Download />
            Exportar CSV
          </Button>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <KpiCard
          label="Por pagar"
          value={formatUsd(totals.pending)}
          icon={<Percent className="size-4" />}
          accent
          hint={`${counts.pending} comisión${counts.pending === 1 ? "" : "es"} pendientes`}
        />
        <KpiCard
          label="Pagado en periodo"
          value={formatUsd(totals.paid)}
          hint={`${counts.paid} comisión${counts.paid === 1 ? "" : "es"} liquidadas`}
        />
        <KpiCard label="Total generado" value={formatUsd(totals.total)} hint="Suma del periodo" />
      </div>

      <Card className="mb-4">
        <CardContent className="grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="grid gap-1.5">
            <Label htmlFor="from" className="text-xs uppercase tracking-wider text-muted-foreground">
              Desde
            </Label>
            <Input id="from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="to" className="text-xs uppercase tracking-wider text-muted-foreground">
              Hasta
            </Label>
            <Input id="to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <Button onClick={applyFilters}>Aplicar rango</Button>
        </CardContent>
      </Card>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)} className="mb-4">
        <TabsList>
          <TabsTrigger value="pending">
            Pendientes
            <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-[10px] font-mono">
              {counts.pending}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="paid">
            Pagadas
            <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-[10px] font-mono">
              {counts.paid}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="all">
            Todas
            <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-[10px] font-mono">
              {counts.all}
            </Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {groups.length === 0 ? (
        <Empty className="border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Percent />
            </EmptyMedia>
            <EmptyTitle>Sin comisiones en este rango</EmptyTitle>
            <EmptyDescription>
              Las comisiones se generan automáticamente cuando una cita se marca como completada.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="space-y-3">
          {groups.map((g) => {
            const isOpen = expanded[g.id] ?? filter === "pending"
            const showPayButton = g.pending > 0
            return (
              <li key={g.id}>
                <Card>
                  <CardContent className="p-0">
                    <button
                      type="button"
                      onClick={() => setExpanded((p) => ({ ...p, [g.id]: !isOpen }))}
                      className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-secondary/30"
                    >
                      <span className="flex size-11 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-foreground">
                        {initials(g.staff?.display_name ?? "?")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold tracking-tight">{g.staff?.display_name ?? "Miembro eliminado"}</p>
                        <p className="text-xs text-muted-foreground">
                          {g.items.length} cita{g.items.length === 1 ? "" : "s"} en el periodo
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={cn(
                            "font-mono text-lg font-semibold tabular-nums",
                            g.pending > 0 ? "text-foreground" : "text-muted-foreground",
                          )}
                        >
                          {formatUsd(g.pending > 0 ? g.pending : g.total)}
                        </p>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          {g.pending > 0 ? "por pagar" : "ya pagado"}
                        </p>
                      </div>
                      <ChevronDown
                        className={cn(
                          "size-4 shrink-0 text-muted-foreground transition-transform",
                          isOpen && "rotate-180",
                        )}
                      />
                    </button>
                    {isOpen && (
                      <div className="border-t border-border bg-secondary/20">
                        <ul className="divide-y divide-border">
                          {g.items.map((r) => {
                            const when = new Date(r.appointments.scheduled_at).toLocaleString("es-VE", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: false,
                              timeZone: "America/Caracas",
                            })
                            return (
                              <li key={r.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                                <div className="min-w-0 flex-1">
                                  <p className="truncate font-medium">{r.appointments.client_name}</p>
                                  <p className="truncate text-xs text-muted-foreground">
                                    {r.appointments.services?.name ?? "Servicio"} ·{" "}
                                    <span className="font-mono">{when}</span>
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-mono font-semibold tabular-nums">
                                    {formatUsd(Number(r.amount_usd))}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">
                                    <span className="font-mono">{Number(r.commission_percentage).toFixed(0)}%</span> de{" "}
                                    <span className="font-mono">{formatUsd(Number(r.service_amount_usd))}</span>
                                  </p>
                                </div>
                                {r.paid ? (
                                  <Badge
                                    variant="outline"
                                    className="border-accent/40 bg-accent/15 text-accent-foreground"
                                  >
                                    Pagada
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                                    Pendiente
                                  </Badge>
                                )}
                              </li>
                            )
                          })}
                        </ul>
                        {showPayButton && (
                          <div className="flex justify-end border-t border-border bg-card p-3">
                            <Button size="sm" onClick={() => markPaid(g.id)} disabled={busy === g.id}>
                              <Check />
                              {busy === g.id ? "Guardando..." : `Marcar ${formatUsd(g.pending)} como pagado`}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
