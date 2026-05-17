"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Plus, Trash2, CalendarOff } from "lucide-react"

const DAY_LABELS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]

type Hours = {
  id: string
  day_of_week: number
  opens_at: string | null
  closes_at: string | null
  closed: boolean
  slot_minutes: number
}

type Blocked = {
  id: string
  date: string
  reason: string | null
}

export function HoursManager({
  tenantId,
  initialHours,
  initialBlocked,
}: {
  tenantId: string
  initialHours: Hours[]
  initialBlocked: Blocked[]
}) {
  const router = useRouter()
  const [hours, setHours] = useState<Hours[]>(initialHours)
  const [blocked, setBlocked] = useState<Blocked[]>(initialBlocked)
  const [savingDay, setSavingDay] = useState<number | null>(null)
  const [adding, setAdding] = useState(false)

  async function saveDay(h: Hours, patch: Partial<Hours>) {
    setSavingDay(h.day_of_week)
    const next = { ...h, ...patch }
    setHours((prev) => prev.map((x) => (x.day_of_week === h.day_of_week ? next : x)))
    const supabase = createClient()
    const { error } = await supabase
      .from("business_hours")
      .update({
        opens_at: next.closed ? null : next.opens_at,
        closes_at: next.closed ? null : next.closes_at,
        closed: next.closed,
        slot_minutes: next.slot_minutes,
      })
      .eq("id", h.id)
    setSavingDay(null)
    if (error) {
      setHours((prev) => prev.map((x) => (x.day_of_week === h.day_of_week ? h : x)))
      alert(error.message)
    } else {
      router.refresh()
    }
  }

  async function removeBlocked(b: Blocked) {
    const supabase = createClient()
    setBlocked((prev) => prev.filter((x) => x.id !== b.id))
    await supabase.from("blocked_days").delete().eq("id", b.id)
    router.refresh()
  }

  function onAdded(b: Blocked) {
    setBlocked((prev) => [...prev, b].sort((a, b) => a.date.localeCompare(b.date)))
    setAdding(false)
    router.refresh()
  }

  return (
    <>
      <h2 className="mb-3 text-sm font-medium text-muted-foreground">Horario semanal</h2>
      <Card className="mb-8">
        <CardContent className="grid gap-1 p-2">
          {hours.map((h) => (
            <DayRow
              key={h.id}
              hours={h}
              busy={savingDay === h.day_of_week}
              onChange={(patch) => saveDay(h, patch)}
            />
          ))}
        </CardContent>
      </Card>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">Días bloqueados</h2>
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
          <Plus />
          Bloquear día
        </Button>
      </div>

      {blocked.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-6 text-center text-sm text-muted-foreground">
            <CalendarOff className="size-5" />
            No tienes días bloqueados próximos.
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-2">
          {blocked.map((b) => (
            <li key={b.id}>
              <Card>
                <CardContent className="flex items-center gap-3 p-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                    <CalendarOff className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold tracking-tight">
                      {new Date(b.date + "T12:00:00").toLocaleDateString("es-VE", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                    </p>
                    {b.reason && <p className="text-xs text-muted-foreground">{b.reason}</p>}
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => removeBlocked(b)}>
                    <Trash2 className="size-4" />
                    <span className="sr-only">Quitar</span>
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {adding && (
        <BlockDayDialog tenantId={tenantId} onClose={() => setAdding(false)} onAdded={onAdded} />
      )}
    </>
  )
}

function DayRow({
  hours,
  busy,
  onChange,
}: {
  hours: Hours
  busy: boolean
  onChange: (patch: Partial<Hours>) => void
}) {
  return (
    <div className="grid grid-cols-[110px_auto_1fr_auto] items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-secondary/30 sm:grid-cols-[140px_auto_1fr_auto]">
      <span className="text-sm font-medium">{DAY_LABELS[hours.day_of_week]}</span>
      <div className="flex items-center gap-2">
        <Switch
          checked={!hours.closed}
          onCheckedChange={(v) => onChange({ closed: !v })}
          disabled={busy}
        />
        <span className="text-xs text-muted-foreground">{hours.closed ? "Cerrado" : "Abierto"}</span>
      </div>
      {hours.closed ? (
        <span className="text-sm text-muted-foreground">—</span>
      ) : (
        <div className="flex items-center gap-2">
          <Input
            type="time"
            value={hours.opens_at?.slice(0, 5) ?? "06:00"}
            onChange={(e) => onChange({ opens_at: e.target.value })}
            disabled={busy}
            className="h-8 w-[110px] font-mono text-sm"
          />
          <span className="text-xs text-muted-foreground">a</span>
          <Input
            type="time"
            value={hours.closes_at?.slice(0, 5) ?? "21:00"}
            onChange={(e) => onChange({ closes_at: e.target.value })}
            disabled={busy}
            className="h-8 w-[110px] font-mono text-sm"
          />
        </div>
      )}
      <Badge variant="outline" className="font-mono text-[10px]">
        {hours.slot_minutes}min
      </Badge>
    </div>
  )
}

function BlockDayDialog({
  tenantId,
  onClose,
  onAdded,
}: {
  tenantId: string
  onClose: () => void
  onAdded: (b: Blocked) => void
}) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    const supabase = createClient()
    const { data, error } = await supabase
      .from("blocked_days")
      .insert({
        tenant_id: tenantId,
        date,
        reason: reason.trim() || null,
      })
      .select()
      .single()
    setBusy(false)
    if (error) {
      setErr(error.message.includes("blocked_days_unique_date") ? "Ese día ya está bloqueado." : error.message)
      return
    }
    onAdded(data as Blocked)
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Bloquear día</DialogTitle>
          <DialogDescription>Feriados, vacaciones o mantenimiento. Las reservas públicas se bloquean para ese día.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="b-date">Fecha</Label>
            <Input id="b-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="b-reason">Razón (opcional)</Label>
            <Input
              id="b-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Feriado nacional, vacaciones..."
            />
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
              {busy ? "Guardando..." : "Bloquear día"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
