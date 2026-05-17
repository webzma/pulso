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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
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
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Plus, Pencil, Trash2, PowerOff, MoreHorizontal, BadgeCheck, CalendarRange, Ticket, Sun } from "lucide-react"
import { formatUsd } from "@/lib/exchange-rate"

type Kind = "monthly" | "pass_pack" | "day_pass"

type Plan = {
  id: string
  name: string
  description: string | null
  kind: Kind
  duration_days: number | null
  sessions_count: number | null
  price_usd: number
  active: boolean
  created_at: string
}

const KIND_LABEL: Record<Kind, string> = {
  monthly: "Mensualidad",
  pass_pack: "Paquete de sesiones",
  day_pass: "Pase diario",
}

const KIND_ICON: Record<Kind, React.ComponentType<{ className?: string }>> = {
  monthly: CalendarRange,
  pass_pack: Ticket,
  day_pass: Sun,
}

export function PlansManager({ tenantId, initialPlans }: { tenantId: string; initialPlans: Plan[] }) {
  const router = useRouter()
  const [plans, setPlans] = useState<Plan[]>(initialPlans)
  const [editing, setEditing] = useState<Plan | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  function openNew() {
    setEditing(null)
    setDialogOpen(true)
  }
  function openEdit(p: Plan) {
    setEditing(p)
    setDialogOpen(true)
  }

  function onSaved(p: Plan) {
    setPlans((prev) => {
      const i = prev.findIndex((x) => x.id === p.id)
      if (i >= 0) {
        const next = [...prev]
        next[i] = p
        return next
      }
      return [p, ...prev]
    })
    setDialogOpen(false)
    setEditing(null)
    router.refresh()
  }

  async function toggleActive(p: Plan) {
    const supabase = createClient()
    const next = !p.active
    setPlans((prev) => prev.map((x) => (x.id === p.id ? { ...x, active: next } : x)))
    await supabase.from("membership_plans").update({ active: next }).eq("id", p.id)
    router.refresh()
  }

  async function remove(p: Plan) {
    if (!confirm(`¿Eliminar "${p.name}"?`)) return
    const supabase = createClient()
    const { error } = await supabase.from("membership_plans").delete().eq("id", p.id)
    if (!error) {
      setPlans((prev) => prev.filter((x) => x.id !== p.id))
      router.refresh()
    } else {
      alert("No se puede eliminar (tiene membresías vendidas). Desactívalo en su lugar.")
    }
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {plans.length} plan{plans.length === 1 ? "" : "es"} · {plans.filter((p) => p.active).length} activo
          {plans.filter((p) => p.active).length === 1 ? "" : "s"}
        </p>
        <Button onClick={openNew}>
          <Plus />
          Nuevo plan
        </Button>
      </div>

      {plans.length === 0 ? (
        <Empty className="border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BadgeCheck />
            </EmptyMedia>
            <EmptyTitle>Aún no tienes planes</EmptyTitle>
            <EmptyDescription>
              Crea una mensualidad estándar, un paquete de 10 clases o pases diarios. Después podrás venderlos a tus
              clientes desde su ficha o desde la URL pública.
            </EmptyDescription>
          </EmptyHeader>
          <Button onClick={openNew}>
            <Plus />
            Crear plan
          </Button>
        </Empty>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {plans.map((p) => {
            const Icon = KIND_ICON[p.kind]
            return (
              <li key={p.id}>
                <Card className={`group transition-colors hover:border-foreground/20 ${p.active ? "" : "opacity-70"}`}>
                  <CardContent className="flex items-start gap-3 p-4">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <h3 className="text-base font-semibold tracking-tight">{p.name}</h3>
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {KIND_LABEL[p.kind]}
                        </Badge>
                        {!p.active && (
                          <Badge variant="secondary" className="text-[10px] uppercase text-muted-foreground">
                            Oculto
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {p.kind === "monthly" && `${p.duration_days} días`}
                        {p.kind === "pass_pack" && `${p.sessions_count} sesiones`}
                        {p.kind === "day_pass" && `Válido 1 día`}
                      </p>
                      {p.description && <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>}
                      <p className="mt-2 font-mono font-semibold">{formatUsd(Number(p.price_usd))}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => openEdit(p)}>
                          <Pencil className="mr-2 size-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleActive(p)}>
                          <PowerOff className="mr-2 size-4" />
                          {p.active ? "Desactivar" : "Activar"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => remove(p)} className="text-destructive focus:text-destructive">
                          <Trash2 className="mr-2 size-4" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardContent>
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      <PlanDialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o)
          if (!o) setEditing(null)
        }}
        tenantId={tenantId}
        initial={editing}
        onSaved={onSaved}
      />
    </>
  )
}

function PlanDialog({
  open,
  onOpenChange,
  tenantId,
  initial,
  onSaved,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  tenantId: string
  initial: Plan | null
  onSaved: (p: Plan) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar plan" : "Nuevo plan"}</DialogTitle>
          <DialogDescription>Define qué incluye y por cuánto tiempo es válido.</DialogDescription>
        </DialogHeader>
        <PlanForm
          key={initial?.id ?? "new"}
          tenantId={tenantId}
          initial={initial}
          onSaved={onSaved}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

function PlanForm({
  tenantId,
  initial,
  onSaved,
  onCancel,
}: {
  tenantId: string
  initial: Plan | null
  onSaved: (p: Plan) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? "")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [kind, setKind] = useState<Kind>(initial?.kind ?? "monthly")
  const [duration, setDuration] = useState(String(initial?.duration_days ?? 30))
  const [sessions, setSessions] = useState(String(initial?.sessions_count ?? 10))
  const [price, setPrice] = useState(String(initial?.price_usd ?? ""))
  const [active, setActive] = useState(initial?.active ?? true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    const supabase = createClient()
    const payload = {
      tenant_id: tenantId,
      name: name.trim(),
      description: description.trim() || null,
      kind,
      duration_days: kind === "monthly" ? Number(duration) : null,
      sessions_count: kind === "pass_pack" ? Number(sessions) : null,
      price_usd: Number(price),
      active,
    }
    try {
      if (initial) {
        const { data, error } = await supabase
          .from("membership_plans")
          .update(payload)
          .eq("id", initial.id)
          .select()
          .single()
        if (error) throw error
        onSaved(data as Plan)
      } else {
        const { data, error } = await supabase.from("membership_plans").insert(payload).select().single()
        if (error) throw error
        onSaved(data as Plan)
      }
    } catch (e: any) {
      setErr(e?.message ?? "No se pudo guardar")
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="p-name">Nombre</Label>
        <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Mensualidad estándar" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="p-kind">Tipo</Label>
        <Select value={kind} onValueChange={(v) => setKind(v as Kind)}>
          <SelectTrigger id="p-kind">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="monthly">Mensualidad (acceso por días)</SelectItem>
            <SelectItem value="pass_pack">Paquete (N sesiones)</SelectItem>
            <SelectItem value="day_pass">Pase diario</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {kind === "monthly" && (
        <div className="grid gap-2">
          <Label htmlFor="p-days">Duración (días)</Label>
          <Input id="p-days" type="number" min={1} value={duration} onChange={(e) => setDuration(e.target.value)} required />
        </div>
      )}
      {kind === "pass_pack" && (
        <div className="grid gap-2">
          <Label htmlFor="p-sess">Sesiones incluidas</Label>
          <Input id="p-sess" type="number" min={1} value={sessions} onChange={(e) => setSessions(e.target.value)} required />
        </div>
      )}
      <div className="grid gap-2">
        <Label htmlFor="p-price">Precio USD</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
          <Input
            id="p-price"
            type="number"
            min={0}
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            className="pl-7 font-mono"
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="p-desc">Descripción (opcional)</Label>
        <Textarea
          id="p-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Qué incluye, restricciones, etc."
        />
      </div>
      <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-3">
        <div>
          <p className="text-sm font-medium">Visible en URL pública</p>
          <p className="text-xs text-muted-foreground">Los clientes podrán verlo y comprarlo en línea</p>
        </div>
        <Switch checked={active} onCheckedChange={setActive} />
      </div>
      {err && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {err}
        </p>
      )}
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? "Guardando..." : initial ? "Guardar" : "Crear plan"}
        </Button>
      </DialogFooter>
    </form>
  )
}
