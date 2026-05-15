"use client"

import { useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, Wallet, Check } from "lucide-react"
import { formatUsd, formatVef, vefToUsd } from "@/lib/exchange-rate"

type SystemTotals = {
  cash_usd: number
  cash_vef: number
  pago_movil: number
  zelle: number
  binance: number
  other: number
}
type ExistingClose = {
  id: string
  business_date: string
  closed_at: string | null
  closing_rate_vef: number | null
  variance_usd: number | null
  notes: string | null
  counted_cash_usd: number
  counted_cash_vef: number
  counted_pago_movil: number
  counted_zelle: number
  counted_binance: number
  counted_other: number
} | null

const ROWS: Array<{
  key: keyof SystemTotals
  label: string
  currency: "USD" | "VEF"
}> = [
  { key: "cash_usd", label: "Efectivo USD", currency: "USD" },
  { key: "cash_vef", label: "Efectivo Bs.", currency: "VEF" },
  { key: "pago_movil", label: "Pago Móvil", currency: "VEF" },
  { key: "zelle", label: "Zelle", currency: "USD" },
  { key: "binance", label: "Binance", currency: "USD" },
  { key: "other", label: "Otros", currency: "USD" },
]

export function CashCloseView({
  tenantId,
  userId,
  date,
  systemTotals,
  systemUsdTotal,
  existing,
  currentRate,
}: {
  tenantId: string
  userId: string
  date: string
  systemTotals: SystemTotals
  systemUsdTotal: number
  existing: ExistingClose
  currentRate: number | null
}) {
  const router = useRouter()
  const search = useSearchParams()

  const [counted, setCounted] = useState<Record<keyof SystemTotals, string>>({
    cash_usd: String(existing?.counted_cash_usd ?? systemTotals.cash_usd ?? 0),
    cash_vef: String(existing?.counted_cash_vef ?? systemTotals.cash_vef ?? 0),
    pago_movil: String(existing?.counted_pago_movil ?? systemTotals.pago_movil ?? 0),
    zelle: String(existing?.counted_zelle ?? systemTotals.zelle ?? 0),
    binance: String(existing?.counted_binance ?? systemTotals.binance ?? 0),
    other: String(existing?.counted_other ?? systemTotals.other ?? 0),
  })
  const [notes, setNotes] = useState(existing?.notes ?? "")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const rateToUse = existing?.closing_rate_vef ?? currentRate

  function shiftDate(delta: number) {
    const d = new Date(`${date}T12:00:00-04:00`)
    d.setUTCDate(d.getUTCDate() + delta)
    const next = d.toISOString().slice(0, 10)
    const params = new URLSearchParams(search.toString())
    params.set("date", next)
    router.push(`/dashboard/caja?${params.toString()}`)
  }

  const totals = useMemo(() => {
    let countedUsd = 0
    const rows = ROWS.map((r) => {
      const sys = systemTotals[r.key]
      const cnt = Number(counted[r.key]) || 0
      let cntUsd = cnt
      let sysUsd = sys
      if (r.currency === "VEF") {
        cntUsd = rateToUse ? vefToUsd(cnt, rateToUse) : 0
        sysUsd = rateToUse ? vefToUsd(sys, rateToUse) : 0
      }
      countedUsd += cntUsd
      return { ...r, sys, cnt, sysUsd, cntUsd, diff: Math.round((cntUsd - sysUsd) * 100) / 100 }
    })
    const variance = Math.round((countedUsd - systemUsdTotal) * 100) / 100
    return { rows, countedUsd, variance }
  }, [counted, systemTotals, rateToUse, systemUsdTotal])

  const dateLabel = useMemo(() => {
    const d = new Date(`${date}T12:00:00-04:00`)
    return d.toLocaleDateString("es-VE", { weekday: "long", day: "numeric", month: "long" })
  }, [date])

  async function save() {
    setErr(null)
    setBusy(true)
    const supabase = createClient()
    try {
      const payload = {
        tenant_id: tenantId,
        business_date: date,
        opened_by: userId,
        closed_at: new Date().toISOString(),
        closing_rate_vef: rateToUse,
        notes: notes.trim() || null,
        system_total_cash_usd: systemTotals.cash_usd,
        system_total_cash_vef: systemTotals.cash_vef,
        system_total_pago_movil: systemTotals.pago_movil,
        system_total_zelle: systemTotals.zelle,
        system_total_binance: systemTotals.binance,
        system_total_other: systemTotals.other,
        counted_cash_usd: Number(counted.cash_usd) || 0,
        counted_cash_vef: Number(counted.cash_vef) || 0,
        counted_pago_movil: Number(counted.pago_movil) || 0,
        counted_zelle: Number(counted.zelle) || 0,
        counted_binance: Number(counted.binance) || 0,
        counted_other: Number(counted.other) || 0,
        variance_usd: totals.variance,
      }
      const op = existing
        ? supabase.from("cash_registers").update(payload).eq("id", existing.id)
        : supabase.from("cash_registers").insert(payload)
      const { error } = await op
      if (error) throw error
      router.refresh()
    } catch (e: any) {
      setErr(e?.message ?? "No se pudo guardar")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Cierre de caja</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Compara lo que cobró el sistema con lo que cuentas físicamente.
        </p>
      </header>

      <div className="mb-4 flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-2">
        <Button size="icon" variant="ghost" onClick={() => shiftDate(-1)}>
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Anterior</span>
        </Button>
        <div className="flex flex-col items-center">
          <p className="text-sm font-medium capitalize">{dateLabel}</p>
          {existing?.closed_at && (
            <span className="text-[10px] uppercase tracking-wider text-accent">cerrado</span>
          )}
        </div>
        <Button size="icon" variant="ghost" onClick={() => shiftDate(1)}>
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">Siguiente</span>
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="grid gap-4 p-5">
          <div className="grid grid-cols-[1.4fr_1fr_1fr_auto] items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
            <div>Método</div>
            <div className="text-right">Sistema</div>
            <div className="text-right">Contado</div>
            <div className="text-right">Dif. USD</div>
          </div>
          {totals.rows.map((r) => (
            <div key={r.key} className="grid grid-cols-[1.4fr_1fr_1fr_auto] items-center gap-2">
              <Label htmlFor={`c-${r.key}`} className="text-sm font-normal">
                {r.label}
              </Label>
              <div className="text-right font-mono text-sm tabular-nums text-muted-foreground">
                {r.currency === "USD" ? formatUsd(r.sys) : formatVef(r.sys)}
              </div>
              <Input
                id={`c-${r.key}`}
                type="number"
                min={0}
                step="0.01"
                value={counted[r.key]}
                onChange={(e) => setCounted((p) => ({ ...p, [r.key]: e.target.value }))}
                className="text-right font-mono"
              />
              <div
                className={`min-w-[64px] text-right font-mono text-sm tabular-nums ${
                  Math.abs(r.diff) < 0.01 ? "text-muted-foreground" : "text-destructive"
                }`}
              >
                {formatUsd(r.diff)}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="mb-6 bg-secondary/40">
        <CardContent className="grid grid-cols-3 gap-4 p-5 text-center">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Sistema</p>
            <p className="mt-1 font-mono text-lg font-semibold">{formatUsd(systemUsdTotal)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Contado</p>
            <p className="mt-1 font-mono text-lg font-semibold">{formatUsd(totals.countedUsd)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Descuadre</p>
            <p
              className={`mt-1 font-mono text-lg font-semibold ${
                Math.abs(totals.variance) < 0.01 ? "text-foreground" : "text-destructive"
              }`}
            >
              {formatUsd(totals.variance)}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="mb-6 grid gap-2">
        <Label htmlFor="notes">Notas (opcional)</Label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          placeholder="Diferencias, observaciones..."
        />
      </div>

      {err && (
        <p className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {err}
        </p>
      )}

      <Button onClick={save} disabled={busy} className="w-full sm:w-auto">
        {busy ? "Guardando..." : existing?.closed_at ? <>Actualizar cierre <Check className="ml-1 h-4 w-4" /></> : <><Wallet className="mr-1 h-4 w-4" /> Cerrar caja</>}
      </Button>
    </div>
  )
}
