"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Pencil, Trash2, X, Crown, User } from "lucide-react"

type Member = {
  id: string
  display_name: string
  role: "owner" | "admin" | "staff"
  commission_percentage: number
  active: boolean
  user_id: string | null
  created_at: string
}

export function TeamManager({ tenantId, initialMembers }: { tenantId: string; initialMembers: Member[] }) {
  const router = useRouter()
  const [members, setMembers] = useState<Member[]>(initialMembers)
  const [editing, setEditing] = useState<Member | null>(null)
  const [creating, setCreating] = useState(false)

  function onSaved(m: Member) {
    setMembers((prev) => {
      const i = prev.findIndex((p) => p.id === m.id)
      if (i >= 0) {
        const next = [...prev]
        next[i] = m
        return next
      }
      return [...prev, m]
    })
    setEditing(null)
    setCreating(false)
    router.refresh()
  }

  async function toggleActive(m: Member) {
    if (m.role === "owner") return
    const supabase = createClient()
    const next = !m.active
    setMembers((prev) => prev.map((p) => (p.id === m.id ? { ...p, active: next } : p)))
    await supabase.from("tenant_members").update({ active: next }).eq("id", m.id)
    router.refresh()
  }

  async function remove(m: Member) {
    if (m.role === "owner") return
    if (!confirm(`¿Eliminar a ${m.display_name}?`)) return
    const supabase = createClient()
    const { error } = await supabase.from("tenant_members").delete().eq("id", m.id)
    if (!error) {
      setMembers((prev) => prev.filter((p) => p.id !== m.id))
      router.refresh()
    } else {
      alert("No se puede eliminar (puede tener citas asociadas). Desactívalo en su lugar.")
    }
  }

  return (
    <div className="space-y-6">
      {!creating && !editing && (
        <Button onClick={() => setCreating(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Agregar miembro
        </Button>
      )}

      {(creating || editing) && (
        <MemberForm
          tenantId={tenantId}
          initial={editing}
          onSaved={onSaved}
          onCancel={() => {
            setCreating(false)
            setEditing(null)
          }}
        />
      )}

      <ul className="grid gap-3">
        {members.map((m) => (
          <li key={m.id}>
            <Card className={m.active ? "" : "opacity-60"}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-foreground">
                    {m.role === "owner" ? <Crown className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </span>
                  <div>
                    <p className="font-medium tracking-tight">{m.display_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.role === "owner" ? "Dueño" : m.role === "admin" ? "Admin" : "Staff"} ·{" "}
                      {Number(m.commission_percentage).toFixed(2)}% de comisión
                    </p>
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-2 sm:gap-3">
                  {m.role !== "owner" && (
                    <>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Switch checked={m.active} onCheckedChange={() => toggleActive(m)} aria-label="Activo" />
                        <span>{m.active ? "Activo" : "Inactivo"}</span>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => setEditing(m)}>
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Editar</span>
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(m)}>
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Eliminar</span>
                      </Button>
                    </>
                  )}
                  {m.role === "owner" && (
                    <Button size="icon" variant="ghost" onClick={() => setEditing(m)}>
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Editar</span>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  )
}

function MemberForm({
  tenantId,
  initial,
  onSaved,
  onCancel,
}: {
  tenantId: string
  initial: Member | null
  onSaved: (m: Member) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.display_name ?? "")
  const [role, setRole] = useState<"owner" | "admin" | "staff">(initial?.role ?? "staff")
  const [pct, setPct] = useState(String(initial?.commission_percentage ?? "40"))
  const [active, setActive] = useState(initial?.active ?? true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    const supabase = createClient()
    const payload = {
      display_name: name.trim(),
      role,
      commission_percentage: Number(pct),
      active,
    }
    try {
      if (initial) {
        const { data, error } = await supabase
          .from("tenant_members")
          .update(payload)
          .eq("id", initial.id)
          .select()
          .single()
        if (error) throw error
        onSaved(data as Member)
      } else {
        const { data, error } = await supabase
          .from("tenant_members")
          .insert({ tenant_id: tenantId, ...payload, user_id: null })
          .select()
          .single()
        if (error) throw error
        onSaved(data as Member)
      }
    } catch (e: any) {
      setErr(e?.message ?? "No se pudo guardar")
    } finally {
      setBusy(false)
    }
  }

  const isOwner = initial?.role === "owner"

  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">
            {initial ? "Editar miembro" : "Nuevo miembro del equipo"}
          </h2>
          <Button size="icon" variant="ghost" onClick={onCancel} type="button">
            <X className="h-4 w-4" />
            <span className="sr-only">Cerrar</span>
          </Button>
        </div>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="m-name">Nombre visible</Label>
            <Input
              id="m-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Carlos Pérez"
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="m-role">Rol</Label>
              <Select
                value={role}
                onValueChange={(v) => setRole(v as "owner" | "admin" | "staff")}
                disabled={isOwner}
              >
                <SelectTrigger id="m-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {isOwner && <SelectItem value="owner">Dueño</SelectItem>}
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="staff">Staff / entrenador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="m-pct">Comisión %</Label>
              <Input
                id="m-pct"
                type="number"
                min={0}
                max={100}
                step="0.5"
                value={pct}
                onChange={(e) => setPct(e.target.value)}
              />
            </div>
          </div>
          {!isOwner && (
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={active} onCheckedChange={setActive} />
              Activo (visible para reservas)
            </label>
          )}
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
