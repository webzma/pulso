"use client"

import { useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  ChevronLeft,
  ChevronRight,
  Wallet,
  Check,
  Banknote,
  Smartphone,
  CircleDollarSign,
  Bitcoin,
  CreditCard,
} from "lucide-react"
import { formatUsd, formatVef, vefToUsd } from "@/lib/exchange-rate"
import { PageHeader } from "../_components/page-header"
import { KpiCard } from "../_components/kpi-card"
import { cn } from "@/lib/utils"

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
  icon: React.ComponentType<{ className?: string }>
}> = [
  { key: "cash_usd", label: "Efectivo USD", currency: "USD", icon: Banknote },
  { key: "cash_vef", label: "Efectivo Bs.", currency: "VEF", icon: Banknote },
  { key: "pago_movil", label: "Pago Móvil", currency: "VEF", icon: Smartphone },
  { key: "zelle", label: "Zelle", currency: "USD", icon: CircleDollarSign },
  { key: "binance", label: "Binance", currency: "USD", icon: Bitcoin },
  { key: "other", label: "Otros", currency: "USD", icon: CreditCard },
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

  const balanced = Math.abs(totals.variance) < 0.01

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Cierre de caja"
        description="Compara lo que cobró el sistema con lo que cuentas físicamente. El descuadre se calcula en USD."
        actions={
          existing?.closed_at ? (
            <Badge variant="outline" className="border-accent/40 bg-accent/15 text-accent-foreground">
              <Check className="size-3" />
              Caja cerrada
            </Badge>
          ) : undefined
        }
      />

      <div className="mb-6 flex items-center justify-between gap-2 rounded-xl border border-border bg-card p-1.5">
        <Button size="icon" variant="ghost" onClick={() => shiftDate(-1)} className="size-9">
          <ChevronLeft />
          <span className="sr-only">Anterior</span>
        </Button>
        <div className="flex flex-col items-center gap-0.5">
          <p className="text-sm font-semibold capitalize tracking-tight">{dateLabel}</p>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {rateToUse ? `tasa Bs. ${rateToUse.toLocaleString("es-VE")}` : "sin tasa"}
          </span>
        </div>
        <Button size="icon" variant="ghost" onClick={() => shiftDate(1)} className="size-9">
          <ChevronRight />
          <span className="sr-only">Siguiente</span>
        </Button>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <KpiCard label="Sistema" value={formatUsd(systemUsdTotal)} hint="Lo que el sistema registró" />
        <KpiCard label="Contado" value={formatUsd(totals.countedUsd)} hint="Lo que tú contaste físicamente" />
        <Card className={cn("relative overflow-hidden", !balanced && "border-destructive/50")}>
          <CardContent className="flex flex-col gap-3 p-5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Descuadre</span>
            <p
              className={cn(
                "font-mono text-3xl font-semibold tabular-nums tracking-tight",
                balanced ? "text-foreground" : "text-destructive",
              )}
            >
              {balanced ? "—" : formatUsd(totals.variance)}
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {balanced ? "Todo cuadra perfectamente" : totals.variance > 0 ? "Sobra dinero contado" : "Falta dinero"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/40 hover:bg-secondary/40">
              <TableHead className="w-[40%]">Método</TableHead>
              <TableHead className="text-right">Sistema</TableHead>
              <TableHead className="text-right">Contado</TableHead>
              <TableHead className="w-[100px] text-right">Dif. USD</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {totals.rows.map((r) => {
              const rowBalanced = Math.abs(r.diff) < 0.01
              return (
                <TableRow key={r.key}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-7 items-center justify-center rounded-md bg-secondary text-foreground">
                        <r.icon className="size-3.5" />
                      </span>
                      <span className="font-medium">{r.label}</span>
                      <Badge variant="outline" className="text-[9px] font-medium uppercase tracking-wider">
                        {r.currency}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-muted-foreground tabular-nums">
                    {r.currency === "USD" ? formatUsd(r.sys) : formatVef(r.sys)}
                  </TableCell>
                  <TableCell>
                    <Input
                      id={`c-${r.key}`}
                      type="number"
                      min={0}
                      step="0.01"
                      value={counted[r.key]}
                      onChange={(e) => setCounted((p) => ({ ...p, [r.key]: e.target.value }))}
                      className="ml-auto h-8 max-w-[140px] text-right font-mono tabular-nums"
                    />
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-mono text-sm tabular-nums",
                      rowBalanced ? "text-muted-foreground" : "font-semibold text-destructive",
                    )}
                  >
                    {rowBalanced ? "—" : formatUsd(r.diff)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Card>

      <div className="mb-6 grid gap-2">
        <Label htmlFor="notes">Notas (opcional)</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Diferencias, observaciones, qué pasó hoy..."
        />
      </div>

      {err && (
        <p className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {err}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button onClick={save} disabled={busy} size="lg">
          {busy ? (
            "Guardando..."
          ) : existing?.closed_at ? (
            <>
              <Check />
              Actualizar cierre
            </>
          ) : (
            <>
              <Wallet />
              Cerrar caja del día
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
