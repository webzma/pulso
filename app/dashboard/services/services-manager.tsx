"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Plus, Trash2, Clock, DollarSign, Pencil, X } from "lucide-react"
import { formatUsd } from "@/lib/exchange-rate"

type Service = {
  id: string
  name: string
  category: string | null
  duration_minutes: number
  price_usd: number
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
  const [creating, setCreating] = useState(false)

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
    setEditing(null)
    setCreating(false)
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

  return (
    <div className="space-y-6">
      {!creating && !editing && (
        <Button onClick={() => setCreating(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Nuevo servicio
        </Button>
      )}

      {(creating || editing) && (
        <ServiceForm
          tenantId={tenantId}
          initial={editing}
          onSaved={onSaved}
          onCancel={() => {
            setCreating(false)
            setEditing(null)
          }}
        />
      )}

      {services.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Aún no tienes servicios. Crea el primero para que aparezca en tu URL pública.
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-3">
          {services.map((s) => (
            <li key={s.id}>
              <Card className={s.active ? "" : "opacity-60"}>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <h3 className="text-base font-semibold tracking-tight">{s.name}</h3>
                      {s.category && (
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
                          {s.category}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> {s.duration_minutes} min
                      </span>
                      <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                        <DollarSign className="h-3.5 w-3.5" />
                        {formatUsd(Number(s.price_usd))}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Switch checked={s.active} onCheckedChange={() => toggleActive(s)} aria-label="Activo" />
                      <span>{s.active ? "Activo" : "Inactivo"}</span>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => setEditing(s)}>
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Editar</span>
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(s)}>
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Eliminar</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
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
    <Card>
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">{initial ? "Editar servicio" : "Nuevo servicio"}</h2>
          <Button size="icon" variant="ghost" onClick={onCancel} type="button">
            <X className="h-4 w-4" />
            <span className="sr-only">Cerrar</span>
          </Button>
        </div>
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
              <Label htmlFor="svc-cat">Categoría (opcional)</Label>
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
          <div className="grid gap-2">
            <Label htmlFor="svc-price">Precio en USD</Label>
            <Input
              id="svc-price"
              type="number"
              min={0}
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={active} onCheckedChange={setActive} />
            Visible en la URL pública
          </label>
          {err && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {err}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
