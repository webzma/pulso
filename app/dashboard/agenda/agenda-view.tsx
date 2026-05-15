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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ChevronLeft,
  ChevronRight,
  CalendarPlus,
  Phone,
  Check,
  X as XIcon,
  Wallet,
  Clock,
  Plus,
  Trash2,
  MessageCircle,
} from "lucide-react"
import { formatUsd, usdToVef, vefToUsd } from "@/lib/exchange-rate"
import { toWhatsappNumber } from "@/lib/phone"

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

  const dateLabel = useMemo(() => {
    const d = new Date(`${date}T12:00:00-04:00`)
    return d.toLocaleDateString("es-VE", {
      weekday: "long",
      day: "numeric",
      month: "long",
    })
  }, [date])

  const totals = useMemo(() => {
    let count = 0
    let revenue = 0
    let pending = 0
    for (const a of appts) {
      if (a.status !== "cancelled" && a.status !== "no_show") count++
      if (a.status === "completed") revenue += Number(a.price_usd)
      if (a.status === "pending") pending++
    }
    return { count, revenue, pending }
  }, [appts])

  return (
    <div>
      <header className="mb-6 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Agenda</h1>
          <Button onClick={() => setCreating(true)} size="sm">
            <CalendarPlus className="mr-1 h-4 w-4" />
            Nueva cita
          </Button>
        </div>
        <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-2">
          <Button size="icon" variant="ghost" onClick={() => shiftDate(-1)}>
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Anterior</span>
          </Button>
          <div className="flex flex-col items-center">
            <p className="text-sm font-medium capitalize">{dateLabel}</p>
            <button onClick={gotoToday} className="text-[10px] uppercase tracking-wider text-accent">
              ir a hoy
            </button>
          </div>
          <Button size="icon" variant="ghost" onClick={() => shiftDate(1)}>
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Siguiente</span>
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="Citas" value={String(totals.count)} />
          <Stat label="Cobrado" value={formatUsd(totals.revenue)} />
          <Stat label="Por confirmar" value={String(totals.pending)} />
        </div>
      </header>

      {appts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No hay citas este día.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
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
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-mono text-base font-semibold">{value}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: Appointment["status"] }) {
  const styles: Record<Appointment["status"], string> = {
    pending: "bg-secondary text-foreground",
    confirmed: "bg-accent/20 text-accent-foreground",
    completed: "bg-foreground text-background",
    cancelled: "bg-destructive/15 text-destructive",
    no_show: "bg-destructive/15 text-destructive",
  }
  const label: Record<Appointment["status"], string> = {
    pending: "Por confirmar",
    confirmed: "Confirmada",
    completed: "Completada",
    cancelled: "Cancelada",
    no_show: "No asistió",
  }
  return (
    <Badge variant="secondary" className={styles[status]}>
      {label[status]}
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
}: {
  appt: Appointment
  serviceName: string
  staffName: string
  onConfirm: () => void
  onCancel: () => void
  onPay: () => void
}) {
  const time = new Date(appt.scheduled_at).toLocaleTimeString("es-VE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Caracas",
  })
  const finished = appt.status === "completed" || appt.status === "cancelled" || appt.status === "no_show"
  const waUrl = `https://wa.me/${toWhatsappNumber(appt.client_phone)}?text=${encodeURIComponent(`Hola ${appt.client_name}, te confirmamos tu cita a las ${time}.`)}`

  return (
    <Card className={finished ? "opacity-80" : ""}>
      <CardContent className="grid gap-3 p-4">
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center rounded-md bg-secondary px-3 py-2">
            <Clock className="mb-1 h-3 w-3 text-muted-foreground" />
            <span className="font-mono text-base font-semibold">{time}</span>
            <span className="text-[10px] text-muted-foreground">{appt.duration_minutes}m</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold tracking-tight">{appt.client_name}</h3>
                <p className="truncate text-sm text-muted-foreground">
                  {serviceName} · {staffName}
                </p>
              </div>
              <StatusBadge status={appt.status} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <a href={`tel:${appt.client_phone}`} className="inline-flex items-center gap-1 underline-offset-2 hover:underline">
                <Phone className="h-3.5 w-3.5" />
                {appt.client_phone}
              </a>
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-accent underline-offset-2 hover:underline"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp
              </a>
              <span className="ml-auto font-mono font-semibold text-foreground">{formatUsd(Number(appt.price_usd))}</span>
            </div>
          </div>
        </div>

        {!finished && (
          <div className="flex flex-wrap gap-2">
            {appt.status === "pending" && (
              <Button size="sm" variant="outline" onClick={onConfirm}>
                <Check className="mr-1 h-4 w-4" />
                Confirmar
              </Button>
            )}
            {(appt.status === "pending" || appt.status === "confirmed") && (
              <Button size="sm" onClick={onPay}>
                <Wallet className="mr-1 h-4 w-4" />
                Cobrar y completar
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onCancel} className="text-destructive hover:text-destructive">
              <XIcon className="mr-1 h-4 w-4" />
              Cancelar
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
    setDrafts((p) => [
      ...p,
      { id: crypto.randomUUID(), method: "cash_vef", amount: "", currency: "VEF" },
    ])
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
        .update({ status: "completed", rate_vef_snapshot: rate, price_vef_snapshot: rate ? usdToVef(target, rate) : null })
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cobrar cita</DialogTitle>
          <DialogDescription>
            {appt.client_name} · {formatUsd(target)}
            {rate ? ` · Tasa Bs. ${rate.toLocaleString("es-VE")}` : ""}
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
                />
              </div>
              <Button size="icon" variant="ghost" onClick={() => remove(d.id)} disabled={drafts.length === 1}>
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Quitar</span>
              </Button>
            </div>
          ))}

          <Button type="button" variant="outline" size="sm" onClick={add}>
            <Plus className="mr-1 h-4 w-4" />
            Agregar método
          </Button>

          <div className="rounded-md bg-secondary/50 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total cobrado</span>
              <span className="font-mono font-semibold">{formatUsd(totalUsd)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Servicio</span>
              <span className="font-mono">{formatUsd(target)}</span>
            </div>
            <div
              className={`mt-1 flex justify-between border-t border-border pt-1 font-medium ${
                balanced ? "text-foreground" : "text-destructive"
              }`}
            >
              <span>Diferencia</span>
              <span className="font-mono">{formatUsd(diff)}</span>
            </div>
            {rate && drafts.some((d) => d.currency === "VEF" && Number(d.amount) > 0) && (
              <p className="mt-2 text-xs text-muted-foreground">
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva cita</DialogTitle>
          <DialogDescription>Agendar manualmente sin pasar por la URL pública.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-3">
          <div className="grid gap-1">
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
            <div className="grid gap-1">
              <Label>Hora</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
            </div>
            <div className="grid gap-1">
              <Label>Profesional</Label>
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
          <div className="grid gap-1">
            <Label>Nombre del cliente</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid gap-1">
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
