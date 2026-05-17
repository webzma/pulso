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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Plus, Trash2, Clock, Pencil, MoreHorizontal, Sparkles, PowerOff, Users } from "lucide-react"
import { formatUsd } from "@/lib/exchange-rate"

type Service = {
  id: string
  name: string
  category: string | null
  duration_minutes: number
  price_usd: number
  capacity: number
  active: boolean
  created_at: string
}

export function ServicesManager({
  tenantId,
  initialServices,
}: {
  tenantId: string
  initialServices: Service[]
}) {
  const router = useRouter()
  const [services, setServices] = useState<Service[]>(initialServices)
  const [editing, setEditing] = useState<Service | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  function openNew() {
    setEditing(null)
    setDialogOpen(true)
  }
  function openEdit(s: Service) {
    setEditing(s)
    setDialogOpen(true)
  }

  function onSaved(s: Service) {
    setServices((prev) => {
      const idx = prev.findIndex((p) => p.id === s.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = s
        return next
      }
      return [s, ...prev]
    })
    setDialogOpen(false)
    setEditing(null)
    router.refresh()
  }

  async function toggleActive(s: Service) {
    const supabase = createClient()
    const next = !s.active
    setServices((prev) => prev.map((p) => (p.id === s.id ? { ...p, active: next } : p)))
    const { error } = await supabase.from("services").update({ active: next }).eq("id", s.id)
    if (error) {
      setServices((prev) => prev.map((p) => (p.id === s.id ? { ...p, active: s.active } : p)))
    }
    router.refresh()
  }

  async function remove(s: Service) {
    if (!confirm(`¿Eliminar "${s.name}"? Las citas pasadas no se borran.`)) return
    const supabase = createClient()
    const { error } = await supabase.from("services").delete().eq("id", s.id)
    if (!error) {
      setServices((prev) => prev.filter((p) => p.id !== s.id))
      router.refresh()
    } else {
      alert("No se pudo eliminar (puede estar referenciado por citas). Desactívalo en su lugar.")
    }
  }

  const activeCount = services.filter((s) => s.active).length

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Badge variant="secondary" className="font-mono">
            {services.length} total
          </Badge>
          <span>·</span>
          <span>
            <span className="font-medium text-foreground">{activeCount}</span> visible{activeCount === 1 ? "" : "s"}{" "}
            públicamente
          </span>
        </div>
        <Button onClick={openNew}>
          <Plus />
          Nuevo servicio
        </Button>
      </div>

      {services.length === 0 ? (
        <Empty className="border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Sparkles />
            </EmptyMedia>
            <EmptyTitle>Aún no tienes servicios</EmptyTitle>
            <EmptyDescription>
              Define tu primer servicio (mensualidad, clase, entrenamiento) para que tus clientes puedan reservar desde
              tu URL pública.
            </EmptyDescription>
          </EmptyHeader>
          <Button onClick={openNew}>
            <Plus />
            Crear servicio
          </Button>
        </Empty>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {services.map((s) => (
            <li key={s.id}>
              <Card
                className={`group transition-colors hover:border-foreground/20 ${
                  s.active ? "" : "opacity-70"
                }`}
              >
                <CardContent className="flex items-start gap-3 p-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground">
                    <Sparkles className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <h3 className="text-base font-semibold tracking-tight">{s.name}</h3>
                      {s.category && (
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                          {s.category}
                        </Badge>
                      )}
                      {!s.active && (
                        <Badge variant="secondary" className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Oculto
                        </Badge>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Clock className="size-3.5" /> {s.duration_minutes} min
                      </span>
                      {s.capacity > 1 && (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Users className="size-3.5" /> cupo {s.capacity}
                        </span>
                      )}
                      <span className="font-mono font-semibold text-foreground">{formatUsd(Number(s.price_usd))}</span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
                      >
                        <MoreHorizontal className="size-4" />
                        <span className="sr-only">Acciones</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => openEdit(s)}>
                        <Pencil className="mr-2 size-4" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleActive(s)}>
                        <PowerOff className="mr-2 size-4" />
                        {s.active ? "Desactivar" : "Activar"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => remove(s)} className="text-destructive focus:text-destructive">
                        <Trash2 className="mr-2 size-4" /> Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <ServiceDialog
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

function ServiceDialog({
  open,
  onOpenChange,
  tenantId,
  initial,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  tenantId: string
  initial: Service | null
  onSaved: (s: Service) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar servicio" : "Nuevo servicio"}</DialogTitle>
          <DialogDescription>
            Esto controla lo que aparece en tu URL pública de reservas.
          </DialogDescription>
        </DialogHeader>
        <ServiceForm
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

function ServiceForm({
  tenantId,
  initial,
  onSaved,
  onCancel,
}: {
  tenantId: string
  initial: Service | null
  onSaved: (s: Service) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? "")
  const [category, setCategory] = useState(initial?.category ?? "")
  const [duration, setDuration] = useState(String(initial?.duration_minutes ?? 60))
  const [price, setPrice] = useState(String(initial?.price_usd ?? ""))
  const [capacity, setCapacity] = useState(String(initial?.capacity ?? 1))
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
      category: category.trim() || null,
      duration_minutes: Number(duration),
      price_usd: Number(price),
      capacity: Math.max(1, Number(capacity) || 1),
      active,
    }
    try {
      if (initial) {
        const { data, error } = await supabase
          .from("services")
          .update(payload)
          .eq("id", initial.id)
          .select()
          .single()
        if (error) throw error
        onSaved(data as Service)
      } else {
        const { data, error } = await supabase.from("services").insert(payload).select().single()
        if (error) throw error
        onSaved(data as Service)
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
        <Label htmlFor="svc-name">Nombre</Label>
        <Input
          id="svc-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Mensualidad estándar"
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="svc-cat">Categoría</Label>
          <Input
            id="svc-cat"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Membresía / Clase / PT"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="svc-dur">Duración (min)</Label>
          <Input
            id="svc-dur"
            type="number"
            min={5}
            step={5}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="svc-price">Precio en USD</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
            <Input
              id="svc-price"
              type="number"
              min={0}
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              className="pl-7 font-mono"
              placeholder="0.00"
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="svc-cap">Cupos por horario</Label>
          <Input
            id="svc-cap"
            type="number"
            min={1}
            step={1}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            required
            className="font-mono"
          />
          <p className="text-[11px] text-muted-foreground">
            1 = sesión personal · &gt;1 = clase grupal (spinning, crossfit, yoga)
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-3">
        <div>
          <p className="text-sm font-medium">Visible en URL pública</p>
          <p className="text-xs text-muted-foreground">Los clientes podrán reservar este servicio</p>
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
          {busy ? "Guardando..." : initial ? "Guardar cambios" : "Crear servicio"}
        </Button>
      </DialogFooter>
    </form>
  )
}
