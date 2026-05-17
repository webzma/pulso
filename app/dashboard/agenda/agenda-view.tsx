"use client"

import { useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import {
  ChevronLeft,
  ChevronRight,
  CalendarPlus,
  Phone,
  Check,
  X as XIcon,
  Wallet,
  Plus,
  Trash2,
  MessageCircle,
  MoreVertical,
  CalendarDays,
  Pencil,
  Receipt,
} from "lucide-react"
import { formatUsd, usdToVef, vefToUsd } from "@/lib/exchange-rate"
import { toWhatsappNumber } from "@/lib/phone"
import { useSwipeable } from "@/hooks/use-swipeable"
import { PageHeader } from "../_components/page-header"
import { KpiCard } from "../_components/kpi-card"
import { ViewToggle } from "./view-toggle"
import { cn } from "@/lib/utils"

type Appointment = {
  id: string
  scheduled_at: string
  duration_minutes: number
  client_name: string
  client_phone: string
  status: "pending" | "confirmed" | "completed" | "cancelled" | "no_show"
  price_usd: number
  service_id: string
  staff_member_id: string | null
  notes: string | null
  receipt_token: string
}
type Service = { id: string; name: string; duration_minutes: number; price_usd: number }
type Staff = { id: string; display_name: string }
type PaymentMethod = "cash_usd" | "cash_vef" | "pago_movil" | "zelle" | "binance" | "transfer_usd" | "other"
type PaymentDraft = { id: string; method: PaymentMethod; amount: string; currency: "USD" | "VEF" }

const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash_usd: "Efectivo USD",
  cash_vef: "Efectivo Bs.",
  pago_movil: "Pago Móvil",
  zelle: "Zelle",
  binance: "Binance",
  transfer_usd: "Transferencia USD",
  other: "Otro",
}
const METHOD_CURRENCY: Record<PaymentMethod, "USD" | "VEF"> = {
  cash_usd: "USD",
  cash_vef: "VEF",
  pago_movil: "VEF",
  zelle: "USD",
  binance: "USD",
  transfer_usd: "USD",
  other: "USD",
}

export function AgendaView({
  tenantId,
  date,
  initialAppointments,
  services,
  staff,
  currentRate,
}: {
  tenantId: string
  date: string
  initialAppointments: Appointment[]
  services: Service[]
  staff: Staff[]
  currentRate: number | null
}) {
  const router = useRouter()
  const search = useSearchParams()
  const [appts, setAppts] = useState<Appointment[]>(initialAppointments)
  const [paying, setPaying] = useState<Appointment | null>(null)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Appointment | null>(null)

  function shiftDate(delta: number) {
    const d = new Date(`${date}T12:00:00-04:00`)
    d.setUTCDate(d.getUTCDate() + delta)
    const next = d.toISOString().slice(0, 10)
    const params = new URLSearchParams(search.toString())
    params.set("date", next)
    router.push(`/dashboard/agenda?${params.toString()}`)
  }

  function gotoToday() {
    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, "0")
    const dd = String(today.getDate()).padStart(2, "0")
    router.push(`/dashboard/agenda?date=${yyyy}-${mm}-${dd}`)
  }

  async function setStatus(a: Appointment, status: Appointment["status"]) {
    const supabase = createClient()
    const prevAppts = appts
    setAppts((p) => p.map((x) => (x.id === a.id ? { ...x, status } : x)))
    const { error } = await supabase.from("appointments").update({ status }).eq("id", a.id)
    if (error) {
      setAppts(prevAppts)
      alert("No se pudo actualizar el estado")
    } else {
      router.refresh()
    }
  }

  function onPaid(updated: Appointment) {
    setAppts((p) => p.map((x) => (x.id === updated.id ? updated : x)))
    setPaying(null)
    router.refresh()
  }

  function onCreated(a: Appointment) {
    setAppts((p) => [...p, a].sort((x, y) => x.scheduled_at.localeCompare(y.scheduled_at)))
    setCreating(false)
    router.refresh()
  }

  function onEdited(updated: Appointment) {
    const sameDay = updated.scheduled_at.slice(0, 10) === date
    setAppts((p) => {
      const next = sameDay ? p.map((x) => (x.id === updated.id ? updated : x)) : p.filter((x) => x.id !== updated.id)
      return [...next].sort((x, y) => x.scheduled_at.localeCompare(y.scheduled_at))
    })
    setEditing(null)
    router.refresh()
  }

  const dateLabel = useMemo(() => {
    const d = new Date(`${date}T12:00:00-04:00`)
    return d.toLocaleDateString("es-VE", {
      weekday: "long",
      day: "numeric",
      month: "long",
    })
  }, [date])

  const isToday = useMemo(() => {
    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, "0")
    const dd = String(today.getDate()).padStart(2, "0")
    return `${yyyy}-${mm}-${dd}` === date
  }, [date])

  const totals = useMemo(() => {
    let count = 0
    let revenue = 0
    let pending = 0
    let completed = 0
    for (const a of appts) {
      if (a.status !== "cancelled" && a.status !== "no_show") count++
      if (a.status === "completed") {
        revenue += Number(a.price_usd)
        completed++
      }
      if (a.status === "pending") pending++
    }
    return { count, revenue, pending, completed }
  }, [appts])

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Agenda"
        description="Confirma, cobra y completa las citas del día."
        actions={
          <div className="flex items-center gap-2">
            <ViewToggle current="day" date={date} />
            <Button onClick={() => setCreating(true)}>
              <CalendarPlus />
              Nueva cita
            </Button>
          </div>
        }
      />

      <div className="mb-6 flex items-center justify-between gap-2 rounded-xl border border-border bg-card p-1.5">
        <Button size="icon" variant="ghost" onClick={() => shiftDate(-1)} className="size-9">
          <ChevronLeft />
          <span className="sr-only">Anterior</span>
        </Button>
        <div className="flex flex-col items-center gap-0.5">
          <p className="text-sm font-semibold capitalize tracking-tight">{dateLabel}</p>
          {!isToday ? (
            <button
              onClick={gotoToday}
              className="text-[10px] font-medium uppercase tracking-wider text-accent hover:underline"
            >
              ir a hoy
            </button>
          ) : (
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">hoy</span>
          )}
        </div>
        <Button size="icon" variant="ghost" onClick={() => shiftDate(1)} className="size-9">
          <ChevronRight />
          <span className="sr-only">Siguiente</span>
        </Button>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <KpiCard label="Citas del día" value={String(totals.count)} />
        <KpiCard label="Cobrado" value={formatUsd(totals.revenue)} accent />
        <KpiCard label="Por confirmar" value={String(totals.pending)} />
      </div>

      {appts.length === 0 ? (
        <Empty className="border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarDays />
            </EmptyMedia>
            <EmptyTitle>No hay citas este día</EmptyTitle>
            <EmptyDescription>
              Comparte tu URL pública para recibir reservas o crea una manualmente.
            </EmptyDescription>
          </EmptyHeader>
          <Button onClick={() => setCreating(true)}>
            <CalendarPlus />
            Nueva cita
          </Button>
        </Empty>
      ) : (
        <ul className="space-y-2">
          {appts.map((a) => {
            const svc = services.find((s) => s.id === a.service_id)
            const st = a.staff_member_id ? staff.find((s) => s.id === a.staff_member_id) : null
            return (
              <li key={a.id}>
                <AppointmentCard
                  appt={a}
                  serviceName={svc?.name ?? "Servicio"}
                  staffName={st?.display_name ?? "Sin asignar"}
                  onConfirm={() => setStatus(a, "confirmed")}
                  onCancel={() => {
                    if (confirm("¿Cancelar esta cita?")) setStatus(a, "cancelled")
                  }}
                  onPay={() => setPaying(a)}
                  onEdit={() => setEditing(a)}
                  onNoShow={() => setStatus(a, "no_show")}
                />
              </li>
            )
          })}
        </ul>
      )}

      {paying && (
        <PaymentDialog
          appt={paying}
          rate={currentRate}
          onClose={() => setPaying(null)}
          onPaid={onPaid}
          tenantId={tenantId}
        />
      )}

      {creating && (
        <NewAppointmentDialog
          tenantId={tenantId}
          date={date}
          services={services}
          staff={staff}
          rate={currentRate}
          onClose={() => setCreating(false)}
          onCreated={onCreated}
        />
      )}

      {editing && (
        <EditAppointmentDialog
          appt={editing}
          services={services}
          staff={staff}
          rate={currentRate}
          onClose={() => setEditing(null)}
          onSaved={onEdited}
        />
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: Appointment["status"] }) {
  const config: Record<Appointment["status"], { label: string; className: string }> = {
    pending: { label: "Por confirmar", className: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300" },
    confirmed: { label: "Confirmada", className: "border-accent/40 bg-accent/15 text-accent-foreground" },
    completed: { label: "Completada", className: "border-foreground/20 bg-foreground/5 text-foreground" },
    cancelled: { label: "Cancelada", className: "border-destructive/30 bg-destructive/10 text-destructive" },
    no_show: { label: "No asistió", className: "border-destructive/30 bg-destructive/10 text-destructive" },
  }
  const c = config[status]
  return (
    <Badge variant="outline" className={cn("text-[10px] font-medium uppercase tracking-wider", c.className)}>
      {c.label}
    </Badge>
  )
}

function AppointmentCard({
  appt,
  serviceName,
  staffName,
  onConfirm,
  onCancel,
  onPay,
  onEdit,
  onNoShow,
}: {
  appt: Appointment
  serviceName: string
  staffName: string
  onConfirm: () => void
  onCancel: () => void
  onPay: () => void
  onEdit: () => void
  onNoShow: () => void
}) {
  const time = new Date(appt.scheduled_at).toLocaleTimeString("es-VE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Caracas",
  })
  const finished = appt.status === "completed" || appt.status === "cancelled" || appt.status === "no_show"
  const receiptUrl = typeof window !== "undefined" ? `${window.location.origin}/r/${appt.receipt_token}` : `/r/${appt.receipt_token}`
  const waUrl = `https://wa.me/${toWhatsappNumber(appt.client_phone)}?text=${encodeURIComponent(`Hola ${appt.client_name}, te confirmamos tu cita a las ${time}.`)}`
  const waReceiptUrl = `https://wa.me/${toWhatsappNumber(appt.client_phone)}?text=${encodeURIComponent(`Hola ${appt.client_name}, aquí está tu comprobante: ${receiptUrl}`)}`

  // Swipe: right = confirm/pay, left = cancel (only on actionable cards)
  const canConfirm = appt.status === "pending"
  const canPay = appt.status === "pending" || appt.status === "confirmed"
  const swipe = useSwipeable({
    threshold: 100,
    disabled: finished,
    onSwipeRight: () => {
      if (canConfirm) onConfirm()
      else if (canPay) onPay()
    },
    onSwipeLeft: () => {
      if (confirm("¿Cancelar esta cita?")) onCancel()
    },
  })

  const accentColor =
    appt.status === "completed"
      ? "bg-foreground"
      : appt.status === "confirmed"
        ? "bg-accent"
        : appt.status === "pending"
          ? "bg-amber-500"
          : "bg-muted-foreground/30"

  const swipeProgress = Math.min(Math.abs(swipe.dragX) / swipe.threshold, 1)
  const swipingRight = swipe.dragX > 0
  const swipingLeft = swipe.dragX < 0

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-colors hover:border-foreground/20",
        finished && "opacity-75",
      )}
    >
      {/* Status accent bar */}
      <span className={cn("absolute inset-y-0 left-0 w-1", accentColor)} aria-hidden />

      {/* Swipe-action backgrounds (mobile only, behind the card content) */}
      {!finished && swipe.active && (
        <>
          <div
            className={cn(
              "pointer-events-none absolute inset-y-0 left-0 flex w-1/2 items-center justify-start gap-2 px-5 text-sm font-medium uppercase tracking-wider transition-opacity",
              "bg-accent text-accent-foreground",
              swipingRight ? "opacity-100" : "opacity-0",
            )}
            style={{ opacity: swipingRight ? swipeProgress : 0 }}
            aria-hidden
          >
            <Check className="size-4" />
            {canConfirm ? "Confirmar" : "Cobrar"}
          </div>
          <div
            className={cn(
              "pointer-events-none absolute inset-y-0 right-0 flex w-1/2 items-center justify-end gap-2 px-5 text-sm font-medium uppercase tracking-wider",
              "bg-destructive text-destructive-foreground",
            )}
            style={{ opacity: swipingLeft ? swipeProgress : 0 }}
            aria-hidden
          >
            Cancelar
            <XIcon className="size-4" />
          </div>
        </>
      )}

      <CardContent
        {...swipe.bind}
        style={{
          ...swipe.bind.style,
          transform: swipe.active ? `translateX(${swipe.dragX}px)` : undefined,
          transition: swipe.active ? "none" : "transform 200ms ease-out",
        }}
        className="relative grid gap-3 bg-card p-4 pl-5"
      >
        <div className="flex items-start gap-4">
          <div className="flex w-16 shrink-0 flex-col items-center rounded-lg bg-secondary/60 px-2 py-2">
            <span className="font-mono text-lg font-semibold leading-none tabular-nums">{time}</span>
            <span className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              {appt.duration_minutes}min
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold tracking-tight">{appt.client_name}</h3>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  {serviceName} <span className="text-muted-foreground/50">·</span> {staffName}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-semibold tabular-nums">
                  {formatUsd(Number(appt.price_usd))}
                </span>
                <StatusBadge status={appt.status} />
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <a
                href={`tel:${appt.client_phone}`}
                className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
              >
                <Phone className="size-3" />
                {appt.client_phone}
              </a>
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-accent-foreground/80 transition-colors hover:text-foreground"
              >
                <MessageCircle className="size-3" />
                WhatsApp
              </a>
            </div>
          </div>
        </div>

        {!finished && (
          <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
            {appt.status === "pending" && (
              <Button size="sm" variant="outline" onClick={onConfirm}>
                <Check />
                Confirmar
              </Button>
            )}
            {(appt.status === "pending" || appt.status === "confirmed") && (
              <Button size="sm" onClick={onPay}>
                <Wallet />
                Cobrar y completar
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="ml-auto size-8">
                  <MoreVertical className="size-4" />
                  <span className="sr-only">Más opciones</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="mr-2 size-4" />
                  Editar / reagendar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onNoShow}>
                  <XIcon className="mr-2 size-4" />
                  Marcar como no asistió
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onCancel} className="text-destructive focus:text-destructive">
                  <Trash2 className="mr-2 size-4" />
                  Cancelar cita
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {appt.status === "completed" && (
          <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
            <Button size="sm" variant="outline" asChild>
              <a href={`/r/${appt.receipt_token}`} target="_blank" rel="noopener noreferrer">
                <Receipt />
                Ver comprobante
              </a>
            </Button>
            <Button size="sm" variant="ghost" asChild>
              <a href={waReceiptUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle />
                Enviar por WhatsApp
              </a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function PaymentDialog({
  appt,
  rate,
  onClose,
  onPaid,
  tenantId,
}: {
  appt: Appointment
  rate: number | null
  onClose: () => void
  onPaid: (a: Appointment) => void
  tenantId: string
}) {
  const [drafts, setDrafts] = useState<PaymentDraft[]>([
    { id: crypto.randomUUID(), method: "cash_usd", amount: String(Number(appt.price_usd).toFixed(2)), currency: "USD" },
  ])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const totalUsd = useMemo(() => {
    let sum = 0
    for (const d of drafts) {
      const amt = Number(d.amount) || 0
      if (d.currency === "USD") sum += amt
      else if (rate && rate > 0) sum += vefToUsd(amt, rate)
    }
    return Math.round(sum * 100) / 100
  }, [drafts, rate])

  const target = Number(appt.price_usd)
  const diff = Math.round((totalUsd - target) * 100) / 100
  const balanced = Math.abs(diff) < 0.01

  function add() {
    setDrafts((p) => [...p, { id: crypto.randomUUID(), method: "cash_vef", amount: "", currency: "VEF" }])
  }
  function update(id: string, patch: Partial<PaymentDraft>) {
    setDrafts((p) =>
      p.map((d) => {
        if (d.id !== id) return d
        const next = { ...d, ...patch }
        if (patch.method) next.currency = METHOD_CURRENCY[patch.method]
        return next
      }),
    )
  }
  function remove(id: string) {
    setDrafts((p) => p.filter((d) => d.id !== id))
  }

  async function submit() {
    setErr(null)
    if (!balanced) {
      setErr(`Falta ${formatUsd(Math.abs(diff))} ${diff > 0 ? "de más" : "para completar"}.`)
      return
    }
    setBusy(true)
    const supabase = createClient()
    try {
      const rows = drafts
        .filter((d) => Number(d.amount) > 0)
        .map((d) => {
          const amt = Number(d.amount)
          const amountUsd = d.currency === "USD" ? amt : rate ? vefToUsd(amt, rate) : 0
          return {
            tenant_id: tenantId,
            appointment_id: appt.id,
            method: d.method,
            amount_original: amt,
            currency: d.currency,
            amount_usd: Math.round(amountUsd * 100) / 100,
            rate_vef_used: rate,
          }
        })
      if (rows.length > 0) {
        const { error: payErr } = await supabase.from("appointment_payments").insert(rows)
        if (payErr) throw payErr
      }
      const { data, error } = await supabase
        .from("appointments")
        .update({
          status: "completed",
          rate_vef_snapshot: rate,
          price_vef_snapshot: rate ? usdToVef(target, rate) : null,
        })
        .eq("id", appt.id)
        .select()
        .single()
      if (error) throw error
      onPaid(data as Appointment)
    } catch (e: any) {
      setErr(e?.message ?? "No se pudo registrar el pago")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cobrar cita</DialogTitle>
          <DialogDescription>
            {appt.client_name} · objetivo {formatUsd(target)}
            {rate ? ` · Bs. ${rate.toLocaleString("es-VE")}/USD` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {drafts.map((d) => (
            <div key={d.id} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
              <div className="grid gap-1">
                <Label className="text-xs">Método</Label>
                <Select value={d.method} onValueChange={(v) => update(d.id, { method: v as PaymentMethod })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(METHOD_LABEL) as PaymentMethod[]).map((m) => (
                      <SelectItem key={m} value={m}>
                        {METHOD_LABEL[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">{d.currency === "USD" ? "Monto USD" : "Monto Bs."}</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={d.amount}
                  onChange={(e) => update(d.id, { amount: e.target.value })}
                  className="font-mono"
                />
              </div>
              <Button size="icon" variant="ghost" onClick={() => remove(d.id)} disabled={drafts.length === 1}>
                <Trash2 className="size-4" />
                <span className="sr-only">Quitar</span>
              </Button>
            </div>
          ))}

          <Button type="button" variant="outline" size="sm" onClick={add}>
            <Plus />
            Agregar método
          </Button>

          <div className="rounded-lg border border-border bg-secondary/40 p-4">
            <div className="grid gap-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Servicio</span>
                <span className="font-mono tabular-nums">{formatUsd(target)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total cobrado</span>
                <span className="font-mono font-semibold tabular-nums">{formatUsd(totalUsd)}</span>
              </div>
              <div
                className={cn(
                  "mt-1 flex justify-between border-t border-border pt-2 font-medium",
                  balanced ? "text-foreground" : "text-destructive",
                )}
              >
                <span>{balanced ? "Cuadrado" : "Diferencia"}</span>
                <span className="font-mono tabular-nums">{balanced ? "—" : formatUsd(diff)}</span>
              </div>
            </div>
            {rate && drafts.some((d) => d.currency === "VEF" && Number(d.amount) > 0) && (
              <p className="mt-3 border-t border-border pt-2 text-[11px] text-muted-foreground">
                Equivalencia Bs. → USD a tasa {rate.toLocaleString("es-VE")}.
              </p>
            )}
          </div>

          {err && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {err}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={busy || !balanced}>
            {busy ? "Guardando..." : "Confirmar pago"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EditAppointmentDialog({
  appt,
  services,
  staff,
  rate,
  onClose,
  onSaved,
}: {
  appt: Appointment
  services: Service[]
  staff: Staff[]
  rate: number | null
  onClose: () => void
  onSaved: (a: Appointment) => void
}) {
  const initialLocal = useMemo(() => {
    const d = new Date(appt.scheduled_at)
    const parts = d.toLocaleString("en-CA", {
      timeZone: "America/Caracas",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    const [datePart, timePart] = parts.split(", ")
    return { date: datePart, time: timePart.slice(0, 5) }
  }, [appt.scheduled_at])

  const [serviceId, setServiceId] = useState(appt.service_id)
  const [staffId, setStaffId] = useState<string>(appt.staff_member_id ?? "")
  const [date, setDate] = useState(initialLocal.date)
  const [time, setTime] = useState(initialLocal.time)
  const [name, setName] = useState(appt.client_name)
  const [phone, setPhone] = useState(appt.client_phone)
  const [price, setPrice] = useState(String(appt.price_usd))
  const [duration, setDuration] = useState(String(appt.duration_minutes))
  const [notes, setNotes] = useState(appt.notes ?? "")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [priceTouched, setPriceTouched] = useState(false)
  const [durationTouched, setDurationTouched] = useState(false)

  function changeService(id: string) {
    setServiceId(id)
    const svc = services.find((s) => s.id === id)
    if (svc) {
      if (!priceTouched) setPrice(String(svc.price_usd))
      if (!durationTouched) setDuration(String(svc.duration_minutes))
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    const supabase = createClient()
    const scheduled_at = `${date}T${time}:00-04:00`
    const priceNum = Number(price)
    try {
      const { data, error } = await supabase
        .from("appointments")
        .update({
          service_id: serviceId,
          staff_member_id: staffId || null,
          client_name: name.trim(),
          client_phone: phone.trim(),
          scheduled_at,
          duration_minutes: Number(duration),
          price_usd: priceNum,
          rate_vef_snapshot: rate,
          price_vef_snapshot: rate ? usdToVef(priceNum, rate) : null,
          notes: notes.trim() || null,
        })
        .eq("id", appt.id)
        .select()
        .single()
      if (error) throw error
      onSaved(data as Appointment)
    } catch (e: any) {
      setErr(e?.message ?? "No se pudo guardar")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar / reagendar</DialogTitle>
          <DialogDescription>
            Cambia hora, servicio o profesional. Si la cita ya fue cobrada, mejor crea una nueva.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Servicio</Label>
            <Select value={serviceId} onValueChange={changeService}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} — {formatUsd(Number(s.price_usd))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="ed-date">Fecha</Label>
              <Input id="ed-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ed-time">Hora</Label>
              <Input id="ed-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="ed-dur">Duración (min)</Label>
              <Input
                id="ed-dur"
                type="number"
                min={5}
                step={5}
                value={duration}
                onChange={(e) => {
                  setDuration(e.target.value)
                  setDurationTouched(true)
                }}
                required
                className="font-mono"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ed-price">Precio USD</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <Input
                  id="ed-price"
                  type="number"
                  min={0}
                  step="0.01"
                  value={price}
                  onChange={(e) => {
                    setPrice(e.target.value)
                    setPriceTouched(true)
                  }}
                  required
                  className="pl-7 font-mono"
                />
              </div>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Entrenador</Label>
            <Select value={staffId || "none"} onValueChange={(v) => setStaffId(v === "none" ? "" : v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin asignar</SelectItem>
                {staff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="ed-name">Cliente</Label>
              <Input id="ed-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ed-phone">Teléfono</Label>
              <Input id="ed-phone" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ed-notes">Notas</Label>
            <Input id="ed-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" />
          </div>
          {err && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {err}
            </p>
          )}
          <DialogFooter>
            <Button variant="ghost" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function NewAppointmentDialog({
  tenantId,
  date,
  services,
  staff,
  rate,
  onClose,
  onCreated,
}: {
  tenantId: string
  date: string
  services: Service[]
  staff: Staff[]
  rate: number | null
  onClose: () => void
  onCreated: (a: Appointment) => void
}) {
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "")
  const [staffId, setStaffId] = useState<string>("")
  const [time, setTime] = useState("10:00")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    const svc = services.find((s) => s.id === serviceId)
    if (!svc) {
      setErr("Selecciona un servicio")
      return
    }
    setBusy(true)
    try {
      const supabase = createClient()
      const scheduled_at = `${date}T${time}:00-04:00`
      const { data, error } = await supabase
        .from("appointments")
        .insert({
          tenant_id: tenantId,
          service_id: svc.id,
          staff_member_id: staffId || null,
          client_name: name.trim(),
          client_phone: phone.trim(),
          scheduled_at,
          duration_minutes: svc.duration_minutes,
          status: "confirmed",
          price_usd: svc.price_usd,
          rate_vef_snapshot: rate,
          price_vef_snapshot: rate ? usdToVef(Number(svc.price_usd), rate) : null,
        })
        .select()
        .single()
      if (error) throw error
      onCreated(data as Appointment)
    } catch (e: any) {
      setErr(e?.message ?? "No se pudo crear")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva cita</DialogTitle>
          <DialogDescription>Agendar manualmente sin pasar por la URL pública.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Servicio</Label>
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona servicio" />
              </SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} — {formatUsd(Number(s.price_usd))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Hora</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
            </div>
            <div className="grid gap-1.5">
              <Label>Entrenador</Label>
              <Select value={staffId || "none"} onValueChange={(v) => setStaffId(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Nombre del cliente</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid gap-1.5">
            <Label>Teléfono</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0412..." required />
          </div>
          {err && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {err}
            </p>
          )}
          <DialogFooter>
            <Button variant="ghost" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Creando..." : "Crear cita"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
