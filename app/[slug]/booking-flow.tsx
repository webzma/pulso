"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import { formatUsd } from "@/lib/exchange-rate"
import { isValidVePhone, toWhatsappNumber } from "@/lib/phone"
import { ArrowLeft, ArrowRight, Check, Clock, Loader2, MessageCircle, User, Users } from "lucide-react"
import { cn } from "@/lib/utils"

type Service = {
  id: string
  name: string
  category: string | null
  duration_minutes: number
  price_usd: number
  capacity: number
}

type Staff = {
  id: string
  display_name: string
  role: string
}

type Tenant = {
  id: string
  name: string
  slug: string
  phone: string | null
}

type Step = 1 | 2 | 3 | 4

type Slot = { slot_at: string; available: boolean }

function nextDays(n: number): Date[] {
  const arr: Date[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = 0; i < n; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    arr.push(d)
  }
  return arr
}

function formatDateLabel(d: Date): { day: string; num: string; month: string } {
  const days = ["DOM", "LUN", "MAR", "MIE", "JUE", "VIE", "SAB"]
  const months = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"]
  return { day: days[d.getDay()], num: String(d.getDate()), month: months[d.getMonth()] }
}

function localDateKey(d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

const BOOKING_ERROR: Record<string, string> = {
  tenant_inactive: "Este negocio no está aceptando reservas en este momento.",
  service_not_found_or_inactive: "El servicio ya no está disponible.",
  slot_in_past: "Ese horario ya pasó. Elige otro.",
  day_closed: "El gimnasio no abre ese día.",
  outside_business_hours: "Ese horario está fuera del horario de atención.",
  day_blocked: "Ese día no hay atención.",
  staff_busy: "Ese profesional ya tiene cita a esa hora.",
  class_full: "Esa clase ya está llena.",
}

export function BookingFlow({
  tenant,
  services,
  staff,
}: {
  tenant: Tenant
  services: Service[]
  staff: Staff[]
}) {
  const [step, setStep] = useState<Step>(1)
  const [service, setService] = useState<Service | null>(null)
  const [staffMember, setStaffMember] = useState<Staff | null>(null)
  const [date, setDate] = useState<Date | null>(null)
  const [time, setTime] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState<{ id: string } | null>(null)

  const [slots, setSlots] = useState<Slot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  const days = useMemo(() => nextDays(14), [])
  const isGroupClass = service && service.capacity > 1

  // Load real availability whenever service/staff/date change
  useEffect(() => {
    if (!service || !date) {
      setSlots([])
      return
    }
    let cancelled = false
    setLoadingSlots(true)
    setTime(null)
    const supabase = createClient()
    supabase
      .rpc("get_public_availability", {
        p_tenant_id: tenant.id,
        p_service_id: service.id,
        p_staff_member_id: isGroupClass ? null : staffMember?.id ?? null,
        p_date: localDateKey(date),
      })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          setSlots([])
        } else {
          setSlots((data as Slot[]) ?? [])
        }
        setLoadingSlots(false)
      })
    return () => {
      cancelled = true
    }
  }, [service, staffMember, date, tenant.id, isGroupClass])

  if (services.length === 0) {
    return (
      <Card className="p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Este negocio aún no ha publicado servicios. Por favor contacta directamente.
        </p>
      </Card>
    )
  }

  if (confirmed) {
    const waMessage = encodeURIComponent(
      `Hola ${tenant.name}! Acabo de reservar:\n\n` +
        `${service?.name}${staffMember ? ` con ${staffMember.display_name}` : ""}\n` +
        `${date ? formatDateLabel(date).day + " " + date.getDate() + "/" + (date.getMonth() + 1) : ""} a las ${time}\n\n` +
        `A nombre de ${name}.`,
    )
    const waLink = tenant.phone ? `https://wa.me/${toWhatsappNumber(tenant.phone)}?text=${waMessage}` : null

    return (
      <div className="space-y-4">
        <Card className="overflow-hidden">
          <div className="border-b border-border bg-accent/30 px-6 py-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <Check className="h-7 w-7" strokeWidth={3} />
            </div>
            <h2 className="mt-4 text-xl font-semibold text-foreground">¡Reserva enviada!</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {tenant.name} confirmará tu cita por WhatsApp en breve.
            </p>
          </div>
          <div className="space-y-3 px-6 py-5 text-sm">
            <Row label="Servicio" value={service!.name} />
            {staffMember && <Row label="Profesional" value={staffMember.display_name} />}
            <Row
              label="Fecha"
              value={date ? `${formatDateLabel(date).day} ${date.getDate()}/${date.getMonth() + 1} a las ${time}` : ""}
            />
            <Row label="A nombre de" value={name} />
            <Row label="Teléfono" value={phone} />
            <Row label="Total" value={formatUsd(service!.price_usd)} highlight />
          </div>
        </Card>

        {waLink && (
          <Button asChild className="w-full" size="lg">
            <a href={waLink} target="_blank" rel="noreferrer">
              <MessageCircle className="mr-2 h-4 w-4" />
              Avisar por WhatsApp
            </a>
          </Button>
        )}
      </div>
    )
  }

  async function handleSubmit() {
    if (!service || !date || !time) return
    setSubmitting(true)
    setError(null)

    const scheduledAtIso = `${localDateKey(date)}T${time}:00-04:00`

    const supabase = createClient()
    const { data, error: rpcErr } = await supabase.rpc("create_public_booking", {
      p_tenant_id: tenant.id,
      p_service_id: service.id,
      p_staff_member_id: isGroupClass ? null : staffMember?.id ?? null,
      p_client_name: name.trim(),
      p_client_phone: phone.replace(/\D/g, ""),
      p_scheduled_at: scheduledAtIso,
      p_notes: notes.trim() || null,
    })

    setSubmitting(false)
    if (rpcErr) {
      const code = (rpcErr.message ?? "").trim()
      setError(BOOKING_ERROR[code] ?? rpcErr.message ?? "No se pudo crear la reserva.")
      return
    }
    setConfirmed({ id: data as string })
  }

  return (
    <div className="space-y-5">
      <Stepper current={step} />

      {step === 1 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">¿Qué quieres reservar?</h2>
          <div className="space-y-2">
            {services.map((s) => {
              const selected = service?.id === s.id
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setService(s)}
                  className={cn(
                    "w-full rounded-xl border bg-card p-4 text-left transition-colors",
                    selected ? "border-foreground ring-2 ring-accent" : "border-border hover:border-foreground/40",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">{s.name}</p>
                      {s.category && <p className="text-xs text-muted-foreground">{s.category}</p>}
                      <p className="mt-1 inline-flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {s.duration_minutes} min
                        </span>
                        {s.capacity > 1 && (
                          <span className="inline-flex items-center gap-1">
                            <Users className="h-3 w-3" /> grupo de {s.capacity}
                          </span>
                        )}
                      </p>
                    </div>
                    <p className="shrink-0 text-base font-semibold text-foreground">{formatUsd(s.price_usd)}</p>
                  </div>
                </button>
              )
            })}
          </div>

          <Button
            size="lg"
            className="w-full"
            disabled={!service}
            onClick={() => setStep(staff.length > 0 && !isGroupClass ? 2 : 3)}
          >
            Continuar
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </section>
      )}

      {step === 2 && !isGroupClass && (
        <section className="space-y-3">
          <BackButton onClick={() => setStep(1)} />
          <h2 className="text-base font-semibold text-foreground">¿Con quién?</h2>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setStaffMember(null)}
              className={cn(
                "w-full rounded-xl border bg-card p-4 text-left transition-colors",
                staffMember === null ? "border-foreground ring-2 ring-accent" : "border-border hover:border-foreground/40",
              )}
            >
              <p className="font-medium text-foreground">Sin preferencia</p>
              <p className="text-xs text-muted-foreground">El gimnasio asigna profesional</p>
            </button>
            {staff.map((m) => {
              const selected = staffMember?.id === m.id
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setStaffMember(m)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border bg-card p-4 text-left transition-colors",
                    selected ? "border-foreground ring-2 ring-accent" : "border-border hover:border-foreground/40",
                  )}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{m.display_name}</p>
                    <p className="text-xs capitalize text-muted-foreground">{m.role}</p>
                  </div>
                </button>
              )
            })}
          </div>
          <Button size="lg" className="w-full" onClick={() => setStep(3)}>
            Continuar
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </section>
      )}

      {step === 3 && (
        <section className="space-y-4">
          <BackButton onClick={() => setStep(staff.length > 0 && !isGroupClass ? 2 : 1)} />
          <div>
            <h2 className="text-base font-semibold text-foreground">Elige fecha y hora</h2>
            <p className="text-xs text-muted-foreground">Solo aparecen horarios realmente disponibles</p>
          </div>

          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
            {days.map((d) => {
              const selected = date && d.toDateString() === date.toDateString()
              const lbl = formatDateLabel(d)
              return (
                <button
                  key={d.toISOString()}
                  type="button"
                  onClick={() => {
                    setDate(d)
                    setTime(null)
                  }}
                  className={cn(
                    "flex w-16 shrink-0 flex-col items-center rounded-xl border px-2 py-3 transition-colors",
                    selected
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-card text-foreground hover:border-foreground/40",
                  )}
                >
                  <span className="text-[10px] font-medium tracking-wider">{lbl.day}</span>
                  <span className="my-0.5 text-lg font-bold leading-none">{lbl.num}</span>
                  <span className="text-[10px] tracking-wider">{lbl.month}</span>
                </button>
              )
            })}
          </div>

          {date && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Hora</p>
              {loadingSlots ? (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Buscando horarios...
                </div>
              ) : slots.length === 0 ? (
                <Card className="p-4 text-center text-sm text-muted-foreground">
                  No hay horarios disponibles este día. Prueba con otro.
                </Card>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {slots.map((s) => {
                    const localTime = new Date(s.slot_at).toLocaleTimeString("es-VE", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                      timeZone: "America/Caracas",
                    })
                    const selected = time === localTime
                    return (
                      <button
                        key={s.slot_at}
                        type="button"
                        disabled={!s.available}
                        onClick={() => setTime(localTime)}
                        className={cn(
                          "rounded-lg border py-2 text-sm font-medium transition-colors",
                          !s.available && "cursor-not-allowed border-border bg-muted/40 text-muted-foreground line-through opacity-60",
                          s.available && !selected && "border-border bg-card text-foreground hover:border-foreground/40",
                          selected && "border-foreground bg-foreground text-background",
                        )}
                      >
                        {localTime}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          <Button size="lg" className="w-full" disabled={!date || !time} onClick={() => setStep(4)}>
            Continuar
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </section>
      )}

      {step === 4 && (
        <section className="space-y-4">
          <BackButton onClick={() => setStep(3)} />
          <h2 className="text-base font-semibold text-foreground">Tus datos</h2>

          <Card className="p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Servicio</span>
                <span className="font-medium text-foreground">{service!.name}</span>
              </div>
              {staffMember && !isGroupClass && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Profesional</span>
                  <span className="font-medium text-foreground">{staffMember.display_name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fecha</span>
                <span className="font-medium text-foreground">
                  {date && `${formatDateLabel(date).day} ${date.getDate()}/${date.getMonth() + 1}`} • {time}
                </span>
              </div>
              <div className="flex justify-between border-t border-border pt-2">
                <span className="font-medium text-foreground">Total</span>
                <span className="font-semibold text-foreground">{formatUsd(service!.price_usd)}</span>
              </div>
            </div>
          </Card>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nombre completo</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Teléfono (WhatsApp)</Label>
              <Input
                id="phone"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                placeholder="04141234567"
              />
              {phone.length > 0 && !isValidVePhone(phone) && (
                <p className="text-xs text-destructive">Ingresa un número venezolano válido (11 dígitos).</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notas (opcional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="¿Algo que el gimnasio deba saber?"
                rows={2}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button
            size="lg"
            className="w-full"
            disabled={!name.trim() || !isValidVePhone(phone) || submitting}
            onClick={handleSubmit}
          >
            {submitting ? "Enviando..." : "Confirmar reserva"}
          </Button>
        </section>
      )}
    </div>
  )
}

function Stepper({ current }: { current: Step }) {
  const labels = ["Servicio", "Profesional", "Horario", "Datos"]
  return (
    <div className="flex items-center gap-1.5">
      {labels.map((label, idx) => {
        const n = idx + 1
        const active = current === n
        const done = current > n
        return (
          <div key={label} className="flex flex-1 items-center gap-1.5">
            <div
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                done
                  ? "bg-accent text-accent-foreground"
                  : active
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : n}
            </div>
            {idx < labels.length - 1 && <div className={cn("h-px flex-1", done ? "bg-accent" : "bg-border")} />}
          </div>
        )
      })}
    </div>
  )
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-ml-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      Atrás
    </button>
  )
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={cn("text-right text-sm", highlight ? "font-semibold text-foreground" : "text-foreground")}>
        {value}
      </span>
    </div>
  )
}
