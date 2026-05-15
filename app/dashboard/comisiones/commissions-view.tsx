"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { User, Check, ChevronDown, ChevronRight } from "lucide-react"
import { formatUsd } from "@/lib/exchange-rate"

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

  const groups = useMemo(() => {
    const byStaff = new Map<string, { staff: Staff | undefined; items: Row[]; pending: number; total: number }>()
    for (const r of data) {
      const s = staff.find((x) => x.id === r.staff_member_id)
      const g = byStaff.get(r.staff_member_id) ?? { staff: s, items: [] as Row[], pending: 0, total: 0 }
      g.items.push(r)
      g.total += Number(r.amount_usd)
      if (!r.paid) g.pending += Number(r.amount_usd)
      byStaff.set(r.staff_member_id, g)
    }
    return Array.from(byStaff.entries()).map(([id, g]) => ({ id, ...g }))
  }, [data, staff])

  const totals = useMemo(() => {
    let pending = 0
    let total = 0
    for (const r of data) {
      total += Number(r.amount_usd)
      if (!r.paid) pending += Number(r.amount_usd)
    }
    return { pending, total }
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

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Comisiones</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Lo que le debes a cada miembro del equipo por las citas completadas.
        </p>
      </header>

      <Card className="mb-4">
        <CardContent className="grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="grid gap-1">
            <Label htmlFor="from">Desde</Label>
            <Input id="from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="to">Hasta</Label>
            <Input id="to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <Button onClick={applyFilters}>Aplicar</Button>
        </CardContent>
      </Card>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Por pagar</p>
            <p className="mt-1 font-mono text-2xl font-semibold text-destructive">{formatUsd(totals.pending)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total generado</p>
            <p className="mt-1 font-mono text-2xl font-semibold">{formatUsd(totals.total)}</p>
          </CardContent>
        </Card>
      </div>

      {groups.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No hay comisiones en este rango.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {groups.map((g) => {
            const isOpen = expanded[g.id] ?? false
            return (
              <li key={g.id}>
                <Card>
                  <CardContent className="p-0">
                    <button
                      type="button"
                      onClick={() => setExpanded((p) => ({ ...p, [g.id]: !isOpen }))}
                      className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-secondary/40"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-foreground">
                        <User className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium tracking-tight">
                          {g.staff?.display_name ?? "Miembro eliminado"}
                        </p>
                        <p className="text-xs text-muted-foreground">{g.items.length} cita(s)</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-lg font-semibold">{formatUsd(g.pending)}</p>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">por pagar</p>
                      </div>
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="border-t border-border">
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
                                    {r.appointments.services?.name ?? "Servicio"} · {when}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-mono font-semibold">{formatUsd(Number(r.amount_usd))}</p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {Number(r.commission_percentage).toFixed(0)}% de{" "}
                                    {formatUsd(Number(r.service_amount_usd))}
                                  </p>
                                </div>
                                {r.paid ? (
                                  <Badge variant="secondary" className="bg-foreground text-background">
                                    Pagada
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary">Pendiente</Badge>
                                )}
                              </li>
                            )
                          })}
                        </ul>
                        {g.pending > 0 && (
                          <div className="border-t border-border p-3">
                            <Button
                              size="sm"
                              onClick={() => markPaid(g.id)}
                              disabled={busy === g.id}
                              className="w-full sm:w-auto"
                            >
                              <Check className="mr-1 h-4 w-4" />
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
