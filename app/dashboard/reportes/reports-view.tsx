"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { TrendingUp, TrendingDown, BarChart3, Wallet, ClipboardList, Percent, Download } from "lucide-react"
import { formatUsd } from "@/lib/exchange-rate"
import { downloadCsv, toCsv } from "@/lib/csv"
import { cn } from "@/lib/utils"

type Status = "pending" | "confirmed" | "completed" | "cancelled" | "no_show"

type Appt = {
  id: string
  scheduled_at: string
  status: Status
  price_usd: number | string
  service_id: string
  staff_member_id: string | null
  created_at: string
}

type PrevAppt = {
  price_usd: number | string
  status: Status
  scheduled_at: string
}

type ServiceRef = { id: string; name: string }
type StaffRef = { id: string; display_name: string }

type CommissionPaid = {
  amount_usd: number | string
  paid: boolean
  paid_at: string | null
  staff_member_id: string
}

const STATUS_COLORS: Record<Status, string> = {
  completed: "var(--accent)",
  confirmed: "oklch(0.78 0.13 200)",
  pending: "oklch(0.85 0.18 80)",
  cancelled: "oklch(0.7 0.18 25)",
  no_show: "oklch(0.6 0.06 0)",
}

const STATUS_LABEL: Record<Status, string> = {
  completed: "Completadas",
  confirmed: "Confirmadas",
  pending: "Pendientes",
  cancelled: "Canceladas",
  no_show: "No asistió",
}

function caracasDayKey(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Caracas" })
}

function shortDayLabel(key: string): string {
  const [, m, d] = key.split("-")
  return `${d}/${m}`
}

export function ReportsView({
  from,
  to,
  appointments,
  prevAppointments,
  services,
  staff,
  commissionsPaid,
}: {
  from: string
  to: string
  appointments: Appt[]
  prevAppointments: PrevAppt[]
  services: ServiceRef[]
  staff: StaffRef[]
  commissionsPaid: CommissionPaid[]
}) {
  const router = useRouter()
  const [fromState, setFromState] = useState(from)
  const [toState, setToState] = useState(to)

  function applyRange() {
    const params = new URLSearchParams()
    params.set("from", fromState)
    params.set("to", toState)
    router.push(`/dashboard/reportes?${params.toString()}`)
  }

  function exportSalesCsv() {
    const serviceById = new Map(services.map((s) => [s.id, s.name]))
    const staffById = new Map(staff.map((s) => [s.id, s.display_name]))
    const csv = toCsv(appointments, [
      { key: "id", label: "ID" },
      { key: "scheduled_at", label: "Programada", format: (v) => new Date(v as string).toISOString() },
      { key: "status", label: "Estado" },
      { key: "price_usd", label: "Precio USD", format: (v) => Number(v).toFixed(2) },
      {
        key: "service_id",
        label: "Servicio",
        format: (v) => serviceById.get(v as string) ?? "",
      },
      {
        key: "staff_member_id",
        label: "Entrenador",
        format: (v) => (v ? staffById.get(v as string) ?? "" : ""),
      },
      { key: "created_at", label: "Creada", format: (v) => new Date(v as string).toISOString() },
    ])
    downloadCsv(`ventas_${from}_${to}.csv`, csv)
  }

  function setPreset(preset: "this_month" | "last_month" | "last_7" | "last_30" | "ytd") {
    const today = new Date()
    let f: Date
    let t: Date = today
    if (preset === "this_month") {
      f = new Date(today.getFullYear(), today.getMonth(), 1)
    } else if (preset === "last_month") {
      f = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      t = new Date(today.getFullYear(), today.getMonth(), 0)
    } else if (preset === "last_7") {
      f = new Date(today)
      f.setDate(today.getDate() - 6)
    } else if (preset === "last_30") {
      f = new Date(today)
      f.setDate(today.getDate() - 29)
    } else {
      f = new Date(today.getFullYear(), 0, 1)
    }
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    setFromState(fmt(f))
    setToState(fmt(t))
    const params = new URLSearchParams()
    params.set("from", fmt(f))
    params.set("to", fmt(t))
    router.push(`/dashboard/reportes?${params.toString()}`)
  }

  // ============================================================================
  // Core metrics
  // ============================================================================
  const completed = useMemo(() => appointments.filter((a) => a.status === "completed"), [appointments])
  const revenue = useMemo(() => completed.reduce((s, a) => s + Number(a.price_usd), 0), [completed])
  const completedCount = completed.length
  const totalBookings = appointments.length
  const totalNonCancelled = appointments.filter((a) => a.status !== "cancelled" && a.status !== "no_show").length
  const conversion = totalBookings > 0 ? (completedCount / totalBookings) * 100 : 0
  const avgTicket = completedCount > 0 ? revenue / completedCount : 0

  // Previous period
  const prevCompleted = prevAppointments.filter((a) => a.status === "completed")
  const prevRevenue = prevCompleted.reduce((s, a) => s + Number(a.price_usd), 0)
  const prevCompletedCount = prevCompleted.length
  const prevTotal = prevAppointments.length
  const prevConversion = prevTotal > 0 ? (prevCompletedCount / prevTotal) * 100 : 0

  const revenueDelta = pctDelta(revenue, prevRevenue)
  const completedDelta = pctDelta(completedCount, prevCompletedCount)
  const conversionDelta = conversion - prevConversion

  // ============================================================================
  // Daily revenue
  // ============================================================================
  const dailyRevenue = useMemo(() => {
    const byDay = new Map<string, { revenue: number; count: number }>()
    // Seed every day in the range with zero so the chart is continuous
    const start = new Date(`${from}T12:00:00-04:00`)
    const end = new Date(`${to}T12:00:00-04:00`)
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      byDay.set(caracasDayKey(d.toISOString()), { revenue: 0, count: 0 })
    }
    for (const a of completed) {
      const k = caracasDayKey(a.scheduled_at)
      const cur = byDay.get(k) ?? { revenue: 0, count: 0 }
      cur.revenue += Number(a.price_usd)
      cur.count += 1
      byDay.set(k, cur)
    }
    return Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, v]) => ({ day, label: shortDayLabel(day), revenue: Math.round(v.revenue * 100) / 100, count: v.count }))
  }, [completed, from, to])

  // ============================================================================
  // Top services
  // ============================================================================
  const topServices = useMemo(() => {
    const map = new Map<string, { revenue: number; count: number }>()
    for (const a of completed) {
      const cur = map.get(a.service_id) ?? { revenue: 0, count: 0 }
      cur.revenue += Number(a.price_usd)
      cur.count += 1
      map.set(a.service_id, cur)
    }
    return Array.from(map.entries())
      .map(([id, v]) => ({
        id,
        name: services.find((s) => s.id === id)?.name ?? "Servicio eliminado",
        revenue: Math.round(v.revenue * 100) / 100,
        count: v.count,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6)
  }, [completed, services])

  // ============================================================================
  // Top staff
  // ============================================================================
  const topStaff = useMemo(() => {
    const map = new Map<string, { revenue: number; count: number }>()
    for (const a of completed) {
      if (!a.staff_member_id) continue
      const cur = map.get(a.staff_member_id) ?? { revenue: 0, count: 0 }
      cur.revenue += Number(a.price_usd)
      cur.count += 1
      map.set(a.staff_member_id, cur)
    }
    return Array.from(map.entries())
      .map(([id, v]) => ({
        id,
        name: staff.find((s) => s.id === id)?.display_name ?? "Miembro eliminado",
        revenue: Math.round(v.revenue * 100) / 100,
        count: v.count,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6)
  }, [completed, staff])

  // ============================================================================
  // Status distribution (for conversion donut)
  // ============================================================================
  const statusBreakdown = useMemo(() => {
    const map = new Map<Status, number>()
    for (const a of appointments) map.set(a.status, (map.get(a.status) ?? 0) + 1)
    return (["completed", "confirmed", "pending", "cancelled", "no_show"] as Status[])
      .map((s) => ({ status: s, label: STATUS_LABEL[s], count: map.get(s) ?? 0, fill: STATUS_COLORS[s] }))
      .filter((r) => r.count > 0)
  }, [appointments])

  // ============================================================================
  // Commissions paid in period
  // ============================================================================
  const commissionsPaidTotal = useMemo(
    () => commissionsPaid.reduce((s, c) => s + Number(c.amount_usd), 0),
    [commissionsPaid],
  )

  const isEmpty = appointments.length === 0

  return (
    <>
      {/* Range picker */}
      <Card className="mb-4">
        <CardContent className="grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="grid gap-1.5">
            <Label htmlFor="rep-from" className="text-xs uppercase tracking-wider text-muted-foreground">
              Desde
            </Label>
            <Input id="rep-from" type="date" value={fromState} onChange={(e) => setFromState(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="rep-to" className="text-xs uppercase tracking-wider text-muted-foreground">
              Hasta
            </Label>
            <Input id="rep-to" type="date" value={toState} onChange={(e) => setToState(e.target.value)} />
          </div>
          <Button onClick={applyRange}>Aplicar</Button>
        </CardContent>
      </Card>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          <PresetBtn onClick={() => setPreset("this_month")}>Este mes</PresetBtn>
          <PresetBtn onClick={() => setPreset("last_month")}>Mes pasado</PresetBtn>
          <PresetBtn onClick={() => setPreset("last_7")}>Últimos 7</PresetBtn>
          <PresetBtn onClick={() => setPreset("last_30")}>Últimos 30</PresetBtn>
          <PresetBtn onClick={() => setPreset("ytd")}>Año actual</PresetBtn>
        </div>
        <Button variant="outline" size="sm" onClick={exportSalesCsv} disabled={appointments.length === 0}>
          <Download />
          Exportar ventas
        </Button>
      </div>

      {isEmpty ? (
        <Empty className="border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BarChart3 />
            </EmptyMedia>
            <EmptyTitle>Sin datos en este rango</EmptyTitle>
            <EmptyDescription>No hay citas registradas en el periodo seleccionado.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          {/* KPIs with MoM deltas */}
          <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiWithDelta
              label="Ingresos"
              value={formatUsd(revenue)}
              icon={<Wallet className="size-4" />}
              accent
              delta={revenueDelta}
              compareLabel={`vs ${formatUsd(prevRevenue)}`}
            />
            <KpiWithDelta
              label="Citas completadas"
              value={String(completedCount)}
              icon={<ClipboardList className="size-4" />}
              delta={completedDelta}
              compareLabel={`vs ${prevCompletedCount}`}
            />
            <KpiWithDelta
              label="Ticket promedio"
              value={formatUsd(avgTicket)}
              delta={pctDelta(avgTicket, prevCompletedCount > 0 ? prevRevenue / prevCompletedCount : 0)}
              compareLabel="por cita completada"
            />
            <KpiWithDelta
              label="Conversión"
              value={`${conversion.toFixed(0)}%`}
              icon={<Percent className="size-4" />}
              delta={conversionDelta}
              deltaUnit="pp"
              compareLabel="reservas → completadas"
            />
          </section>

          {/* Daily revenue chart */}
          <Card className="mb-6">
            <CardContent className="p-5">
              <div className="mb-4 flex items-baseline justify-between">
                <h2 className="text-sm font-semibold tracking-tight">Ingresos por día</h2>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {dailyRevenue.length} día{dailyRevenue.length === 1 ? "" : "s"}
                </Badge>
              </div>
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyRevenue} margin={{ top: 4, right: 12, left: -8, bottom: 0 }}>
                    <CartesianGrid stroke="oklch(from var(--border) l c h)" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `$${v}`}
                    />
                    <Tooltip content={<DailyTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="var(--accent)"
                      strokeWidth={2}
                      dot={{ r: 3, strokeWidth: 0, fill: "var(--accent)" }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="mb-6 grid gap-4 lg:grid-cols-2">
            {/* Top services */}
            <Card>
              <CardContent className="p-5">
                <h2 className="mb-4 text-sm font-semibold tracking-tight">Top servicios</h2>
                {topServices.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin servicios completados en el periodo.</p>
                ) : (
                  <>
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topServices} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
                          <XAxis
                            type="number"
                            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v) => `$${v}`}
                          />
                          <YAxis
                            type="category"
                            dataKey="name"
                            tick={{ fontSize: 11, fill: "var(--foreground)" }}
                            tickLine={false}
                            axisLine={false}
                            width={120}
                          />
                          <Tooltip content={<TopTooltip moneyKey="revenue" />} />
                          <Bar dataKey="revenue" fill="var(--accent)" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <ul className="mt-3 divide-y divide-border border-t border-border text-sm">
                      {topServices.map((s) => (
                        <li key={s.id} className="flex items-center justify-between py-1.5">
                          <span className="truncate">{s.name}</span>
                          <span className="font-mono tabular-nums text-muted-foreground">
                            {s.count} · {formatUsd(s.revenue)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Top staff */}
            <Card>
              <CardContent className="p-5">
                <h2 className="mb-4 text-sm font-semibold tracking-tight">Top entrenadores</h2>
                {topStaff.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Ninguna cita completada tiene entrenador asignado.</p>
                ) : (
                  <>
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topStaff} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
                          <XAxis
                            type="number"
                            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v) => `$${v}`}
                          />
                          <YAxis
                            type="category"
                            dataKey="name"
                            tick={{ fontSize: 11, fill: "var(--foreground)" }}
                            tickLine={false}
                            axisLine={false}
                            width={120}
                          />
                          <Tooltip content={<TopTooltip moneyKey="revenue" />} />
                          <Bar dataKey="revenue" fill="var(--primary)" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <ul className="mt-3 divide-y divide-border border-t border-border text-sm">
                      {topStaff.map((s) => (
                        <li key={s.id} className="flex items-center justify-between py-1.5">
                          <span className="truncate">{s.name}</span>
                          <span className="font-mono tabular-nums text-muted-foreground">
                            {s.count} · {formatUsd(s.revenue)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
            {/* Status breakdown */}
            <Card>
              <CardContent className="p-5">
                <h2 className="mb-1 text-sm font-semibold tracking-tight">Estado de las reservas</h2>
                <p className="mb-4 text-xs text-muted-foreground">
                  De {totalBookings} reservas en el periodo, {completedCount} completaron.
                </p>
                <div className="flex flex-col items-center gap-4 sm:flex-row">
                  <div className="h-[180px] w-[180px] shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusBreakdown}
                          dataKey="count"
                          nameKey="label"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={2}
                          stroke="var(--background)"
                          strokeWidth={2}
                        >
                          {statusBreakdown.map((entry) => (
                            <Cell key={entry.status} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip content={<StatusTooltip total={totalBookings} />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="grid flex-1 gap-1.5 text-sm">
                    {statusBreakdown.map((s) => (
                      <li key={s.status} className="flex items-center gap-2">
                        <span className="size-2.5 rounded-sm" style={{ background: s.fill }} aria-hidden />
                        <span className="flex-1">{s.label}</span>
                        <span className="font-mono tabular-nums text-muted-foreground">
                          {s.count}{" "}
                          <span className="text-[10px]">
                            ({((s.count / totalBookings) * 100).toFixed(0)}%)
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Operational summary */}
            <Card>
              <CardContent className="p-5">
                <h2 className="mb-4 text-sm font-semibold tracking-tight">Resumen operativo</h2>
                <dl className="grid gap-3 text-sm">
                  <SummaryRow label="Reservas creadas" value={String(totalBookings)} />
                  <SummaryRow label="No canceladas" value={String(totalNonCancelled)} />
                  <SummaryRow
                    label="Conversión a completadas"
                    value={`${conversion.toFixed(1)}%`}
                  />
                  <SummaryRow
                    label="Comisiones pagadas"
                    value={formatUsd(commissionsPaidTotal)}
                    hint={`${commissionsPaid.length} pago${commissionsPaid.length === 1 ? "" : "s"}`}
                  />
                  <SummaryRow
                    label="Margen estimado"
                    value={formatUsd(revenue - commissionsPaidTotal)}
                    hint="Ingresos − comisiones pagadas"
                    highlight
                  />
                </dl>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </>
  )
}

function PresetBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
    >
      {children}
    </button>
  )
}

function pctDelta(current: number, prev: number): number | null {
  if (prev === 0) {
    if (current === 0) return 0
    return null // can't compute % from zero
  }
  return ((current - prev) / Math.abs(prev)) * 100
}

function KpiWithDelta({
  label,
  value,
  icon,
  accent,
  delta,
  deltaUnit = "%",
  compareLabel,
}: {
  label: string
  value: string
  icon?: React.ReactNode
  accent?: boolean
  delta: number | null
  deltaUnit?: "%" | "pp"
  compareLabel: string
}) {
  const up = delta !== null && delta > 0.5
  const down = delta !== null && delta < -0.5
  const flat = delta !== null && !up && !down

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
          {icon && (
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-md",
                accent ? "bg-accent text-accent-foreground" : "bg-secondary text-foreground",
              )}
            >
              {icon}
            </span>
          )}
        </div>
        <p className="font-mono text-3xl font-semibold tabular-nums tracking-tight">{value}</p>
        <div className="flex items-center gap-2 text-xs">
          {delta === null ? (
            <span className="text-muted-foreground">{compareLabel}</span>
          ) : (
            <>
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold",
                  up && "bg-accent/15 text-accent-foreground",
                  down && "bg-destructive/15 text-destructive",
                  flat && "bg-secondary text-muted-foreground",
                )}
              >
                {up && <TrendingUp className="size-3" />}
                {down && <TrendingDown className="size-3" />}
                {delta > 0 ? "+" : ""}
                {delta.toFixed(1)}
                {deltaUnit}
              </span>
              <span className="truncate text-muted-foreground">{compareLabel}</span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function SummaryRow({
  label,
  value,
  hint,
  highlight,
}: {
  label: string
  value: string
  hint?: string
  highlight?: boolean
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3 border-b border-border pb-2 last:border-0 last:pb-0")}>
      <div className="min-w-0">
        <dt className={cn("text-sm", highlight && "font-medium text-foreground")}>{label}</dt>
        {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      </div>
      <dd className={cn("font-mono text-sm tabular-nums", highlight && "text-base font-semibold")}>{value}</dd>
    </div>
  )
}

function DailyTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null
  const p = payload[0].payload
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-mono">{p.label}</p>
      <p className="mt-0.5 font-semibold">{formatUsd(p.revenue)}</p>
      <p className="text-muted-foreground">
        {p.count} cita{p.count === 1 ? "" : "s"}
      </p>
    </div>
  )
}

function TopTooltip({ moneyKey, active, payload }: any) {
  if (!active || !payload?.[0]) return null
  const p = payload[0].payload
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium">{p.name}</p>
      <p className="mt-0.5 font-semibold">{formatUsd(p[moneyKey])}</p>
      <p className="text-muted-foreground">
        {p.count} cita{p.count === 1 ? "" : "s"}
      </p>
    </div>
  )
}

function StatusTooltip({ total, active, payload }: any) {
  if (!active || !payload?.[0]) return null
  const p = payload[0].payload
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium">{p.label}</p>
      <p className="font-mono">
        {p.count} <span className="text-muted-foreground">({((p.count / total) * 100).toFixed(0)}%)</span>
      </p>
    </div>
  )
}
