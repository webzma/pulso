"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowLeft,
  Phone,
  Mail,
  MessageCircle,
  CalendarDays,
  BadgeCheck,
  Plus,
  Pencil,
  Wallet,
} from "lucide-react"
import { formatUsd } from "@/lib/exchange-rate"
import { formatVePhone, toWhatsappNumber } from "@/lib/phone"
import { PageHeader } from "../../_components/page-header"
import { KpiCard } from "../../_components/kpi-card"
import { cn } from "@/lib/utils"

type Plan = {
  id: string
  name: string
  kind: "monthly" | "pass_pack" | "day_pass"
  duration_days: number | null
  sessions_count: number | null
  price_usd: number
}

type Membership = {
  id: string
  starts_at: string
  ends_at: string | null
  sessions_total: number | null
  sessions_remaining: number | null
  status: "active" | "expired" | "cancelled" | "pending"
  price_usd_paid: number | null
  plan: { id: string; name: string; kind: Plan["kind"] } | null
}

type Appointment = {
  id: string
  scheduled_at: string
  duration_minutes: number
  status: "pending" | "confirmed" | "completed" | "cancelled" | "no_show"
  price_usd: number
  service: { name: string } | null
  staff: { display_name: string } | null
}

type Client = {
  id: string
  name: string
  phone: string
  email: string | null
  notes: string | null
  created_at: string
}

const STATUS_LABEL: Record<Appointment["status"], string> = {
  pending: "Por confirmar",
  confirmed: "Confirmada",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No asistió",
}

const PLAN_KIND_LABEL: Record<Plan["kind"], string> = {
  monthly: "Mensualidad",
  pass_pack: "Paquete de sesiones",
  day_pass: "Pase diario",
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

function dateLabel(d: string) {
  return new Date(d).toLocaleDateString("es-VE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "America/Caracas",
  })
}

function dateTimeLabel(d: string) {
  return new Date(d).toLocaleString("es-VE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Caracas",
  })
}

export function ClientDetail({
  tenantId,
  client,
  appointments,
  memberships,
  plans,
}: {
  tenantId: string
  client: Client
  appointments: Appointment[]
  memberships: Membership[]
  plans: Plan[]
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [sellingPlan, setSellingPlan] = useState(false)

  const active = memberships.find((m) => m.status === "active")
  const totalSpent = appointments
    .filter((a) => a.status === "completed")
    .reduce((s, a) => s + Number(a.price_usd), 0)
  const completedCount = appointments.filter((a) => a.status === "completed").length
  const upcoming = appointments.find((a) => a.status === "pending" || a.status === "confirmed")
  const waUrl = `https://wa.me/${toWhatsappNumber(client.phone)}?text=${encodeURIComponent(
    `Hola ${client.name},`,
  )}`

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/dashboard/clientes"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Volver a clientes
      </Link>

      <PageHeader
        title={client.name}
        description={`Cliente desde ${dateLabel(client.created_at)}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href={waUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle />
                WhatsApp
              </a>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              <Pencil />
              Editar
            </Button>
          </div>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <KpiCard label="Citas totales" value={String(appointments.length)} />
        <KpiCard label="Completadas" value={String(completedCount)} />
        <KpiCard label="Gastado" value={formatUsd(totalSpent)} accent />
        <Card>
          <CardContent className="flex flex-col gap-2 p-5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Membresía
            </span>
            {active ? (
              <>
                <p className="font-semibold tracking-tight">{active.plan?.name ?? "—"}</p>
                <p className="text-xs text-muted-foreground">
                  {active.plan?.kind === "pass_pack"
                    ? `${active.sessions_remaining ?? 0} sesion${active.sessions_remaining === 1 ? "" : "es"} restantes`
                    : active.ends_at
                      ? `Vence ${dateLabel(active.ends_at)}`
                      : "Sin vencimiento"}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">Sin plan activo</p>
                <Button size="sm" variant="outline" className="mt-1" onClick={() => setSellingPlan(true)}>
                  <Plus />
                  Vender plan
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardContent className="grid gap-2 p-5 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Teléfono</p>
            <p className="mt-1 inline-flex items-center gap-1.5 font-mono text-sm">
              <Phone className="size-3.5" />
              {formatVePhone(client.phone)}
            </p>
          </div>
          {client.email && (
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Email</p>
              <p className="mt-1 inline-flex items-center gap-1.5 text-sm">
                <Mail className="size-3.5" />
                {client.email}
              </p>
            </div>
          )}
          {client.notes && (
            <div className="sm:col-span-2">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Notas</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{client.notes}</p>
            </div>
          )}
          {upcoming && (
            <div className="sm:col-span-2">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Próxima cita</p>
              <p className="mt-1 inline-flex items-center gap-1.5 text-sm">
                <CalendarDays className="size-3.5" />
                {dateTimeLabel(upcoming.scheduled_at)} — {upcoming.service?.name ?? "Servicio"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">Membresías</h2>
        {plans.length > 0 && (
          <Button size="sm" variant="outline" onClick={() => setSellingPlan(true)}>
            <Plus />
            Vender plan
          </Button>
        )}
      </div>
      {memberships.length === 0 ? (
        <Card className="mb-8">
          <CardContent className="p-5 text-sm text-muted-foreground">
            {plans.length === 0
              ? "Aún no tienes planes definidos. Crea uno en Planes."
              : "Este cliente no ha comprado ninguna membresía todavía."}
          </CardContent>
        </Card>
      ) : (
        <ul className="mb-8 grid gap-2">
          {memberships.map((m) => (
            <li key={m.id}>
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-secondary">
                    <BadgeCheck className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <p className="truncate font-semibold tracking-tight">{m.plan?.name ?? "Plan eliminado"}</p>
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {m.plan ? PLAN_KIND_LABEL[m.plan.kind] : "—"}
                      </Badge>
                      <StatusBadge status={m.status} />
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {m.plan?.kind === "pass_pack"
                        ? `${m.sessions_remaining ?? 0} / ${m.sessions_total ?? 0} sesiones`
                        : m.ends_at
                          ? `${dateLabel(m.starts_at)} → ${dateLabel(m.ends_at)}`
                          : `Desde ${dateLabel(m.starts_at)}`}
                    </p>
                  </div>
                  <p className="font-mono text-sm font-semibold tabular-nums">
                    {formatUsd(Number(m.price_usd_paid ?? 0))}
                  </p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">Historial de citas</h2>
      </div>
      {appointments.length === 0 ? (
        <Card>
          <CardContent className="p-5 text-sm text-muted-foreground">Sin citas registradas.</CardContent>
        </Card>
      ) : (
        <ul className="grid gap-2">
          {appointments.map((a) => (
            <li key={a.id}>
              <Card>
                <CardContent className="flex items-center gap-3 p-3">
                  <div className="flex w-16 shrink-0 flex-col items-center rounded-lg bg-secondary/60 px-2 py-1.5">
                    <span className="font-mono text-sm font-semibold leading-none tabular-nums">
                      {new Date(a.scheduled_at).toLocaleTimeString("es-VE", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                        timeZone: "America/Caracas",
                      })}
                    </span>
                    <span className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                      {new Date(a.scheduled_at).toLocaleDateString("es-VE", {
                        day: "2-digit",
                        month: "short",
                        timeZone: "America/Caracas",
                      })}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.service?.name ?? "Servicio"}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {a.staff?.display_name ?? "Sin asignar"} · {a.duration_minutes} min
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-semibold tabular-nums">{formatUsd(Number(a.price_usd))}</p>
                    <StatusBadge status={a.status} small />
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <EditClientDialog
          client={client}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false)
            router.refresh()
          }}
        />
      )}

      {sellingPlan && plans.length > 0 && (
        <SellPlanDialog
          tenantId={tenantId}
          clientId={client.id}
          plans={plans}
          onClose={() => setSellingPlan(false)}
          onSold={() => {
            setSellingPlan(false)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}

function StatusBadge({
  status,
  small,
}: {
  status: Appointment["status"] | Membership["status"]
  small?: boolean
}) {
  const isAppt = status in STATUS_LABEL
  const label = isAppt
    ? STATUS_LABEL[status as Appointment["status"]]
    : status === "active"
      ? "Activa"
      : status === "expired"
        ? "Vencida"
        : status === "cancelled"
          ? "Cancelada"
          : "Pendiente"

  const cls =
    status === "completed" || status === "active"
      ? "border-accent/40 bg-accent/15 text-accent-foreground"
      : status === "pending" || status === "confirmed"
        ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
        : "border-destructive/30 bg-destructive/10 text-destructive"

  return (
    <Badge
      variant="outline"
      className={cn("text-[10px] font-medium uppercase tracking-wider", cls, small && "mt-1")}
    >
      {label}
    </Badge>
  )
}

function EditClientDialog({
  client,
  onClose,
  onSaved,
}: {
  client: Client
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(client.name)
  const [email, setEmail] = useState(client.email ?? "")
  const [notes, setNotes] = useState(client.notes ?? "")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    const supabase = createClient()
    const { error } = await supabase
      .from("clients")
      .update({
        name: name.trim(),
        email: email.trim() || null,
        notes: notes.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", client.id)
    setBusy(false)
    if (error) {
      setErr(error.message)
      return
    }
    onSaved()
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar cliente</DialogTitle>
          <DialogDescription>El teléfono no se puede cambiar — es la clave única.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="e-name">Nombre</Label>
            <Input id="e-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="e-email">Email</Label>
            <Input id="e-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="e-notes">Notas</Label>
            <Textarea id="e-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
          {err && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {err}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function SellPlanDialog({
  tenantId,
  clientId,
  plans,
  onClose,
  onSold,
}: {
  tenantId: string
  clientId: string
  plans: Plan[]
  onClose: () => void
  onSold: () => void
}) {
  const [planId, setPlanId] = useState(plans[0]?.id ?? "")
  const [startsAt, setStartsAt] = useState(() => new Date().toISOString().slice(0, 10))
  const [paidPrice, setPaidPrice] = useState(String(plans[0]?.price_usd ?? ""))
  const [notes, setNotes] = useState("")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const selectedPlan = plans.find((p) => p.id === planId)

  function changePlan(id: string) {
    setPlanId(id)
    const p = plans.find((x) => x.id === id)
    if (p) setPaidPrice(String(p.price_usd))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    const supabase = createClient()
    const { error } = await supabase.from("client_memberships").insert({
      tenant_id: tenantId,
      client_id: clientId,
      plan_id: planId,
      starts_at: startsAt,
      price_usd_paid: Number(paidPrice) || 0,
      notes: notes.trim() || null,
      status: "active",
    })
    setBusy(false)
    if (error) {
      setErr(error.message)
      return
    }
    onSold()
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Vender plan</DialogTitle>
          <DialogDescription>El vencimiento se calcula automáticamente desde la fecha de inicio.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Plan</Label>
            <Select value={planId} onValueChange={changePlan}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {plans.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} — {formatUsd(Number(p.price_usd))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedPlan && (
              <p className="text-xs text-muted-foreground">
                {selectedPlan.kind === "monthly" && `${selectedPlan.duration_days} días desde el inicio.`}
                {selectedPlan.kind === "pass_pack" && `${selectedPlan.sessions_count} sesiones.`}
                {selectedPlan.kind === "day_pass" && `Válido el día seleccionado.`}
              </p>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="s-start">Inicio</Label>
              <Input id="s-start" type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="s-price">Precio cobrado USD</Label>
              <div className="relative">
                <Wallet className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="s-price"
                  type="number"
                  min={0}
                  step="0.01"
                  value={paidPrice}
                  onChange={(e) => setPaidPrice(e.target.value)}
                  className="pl-9 font-mono"
                  required
                />
              </div>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="s-notes">Notas (opcional)</Label>
            <Textarea id="s-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          {err && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {err}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy || !planId}>
              {busy ? "Registrando..." : "Registrar venta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
