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
import { Plus, Pencil, Trash2, Crown, MoreHorizontal, PowerOff, Users } from "lucide-react"

type Member = {
  id: string
  display_name: string
  role: "owner" | "admin" | "staff"
  commission_percentage: number
  active: boolean
  user_id: string | null
  created_at: string
}

const ROLE_LABEL: Record<Member["role"], string> = {
  owner: "Dueño",
  admin: "Admin",
  staff: "Entrenador",
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function TeamManager({ tenantId, initialMembers }: { tenantId: string; initialMembers: Member[] }) {
  const router = useRouter()
  const [members, setMembers] = useState<Member[]>(initialMembers)
  const [editing, setEditing] = useState<Member | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  function openNew() {
    setEditing(null)
    setDialogOpen(true)
  }
  function openEdit(m: Member) {
    setEditing(m)
    setDialogOpen(true)
  }

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
    setDialogOpen(false)
    setEditing(null)
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

  const staffCount = members.filter((m) => m.role !== "owner").length

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{staffCount}</span> entrenador{staffCount === 1 ? "" : "es"} ·{" "}
          {members.filter((m) => m.active).length} activo{members.filter((m) => m.active).length === 1 ? "" : "s"}
        </div>
        <Button onClick={openNew}>
          <Plus />
          Agregar miembro
        </Button>
      </div>

      {staffCount === 0 ? (
        <Empty className="border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users />
            </EmptyMedia>
            <EmptyTitle>Aún no tienes entrenadores</EmptyTitle>
            <EmptyDescription>
              Agrega a las personas que atienden citas en tu gimnasio. Configurarás su porcentaje de comisión y aparecerán
              como opciones al reservar.
            </EmptyDescription>
          </EmptyHeader>
          <Button onClick={openNew}>
            <Plus />
            Agregar entrenador
          </Button>
        </Empty>
      ) : null}

      {members.length > 0 && (
        <ul className="grid gap-3">
          {members.map((m) => (
            <li key={m.id}>
              <Card
                className={`group transition-colors hover:border-foreground/20 ${
                  m.active ? "" : "opacity-70"
                }`}
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-foreground">
                    {initials(m.display_name)}
                    {m.role === "owner" && (
                      <span className="absolute -bottom-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-accent text-accent-foreground">
                        <Crown className="size-3" />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <p className="truncate font-semibold tracking-tight">{m.display_name}</p>
                      <Badge variant={m.role === "owner" ? "default" : "secondary"} className="text-[10px] uppercase">
                        {ROLE_LABEL[m.role]}
                      </Badge>
                      {!m.active && (
                        <Badge variant="outline" className="text-[10px] uppercase text-muted-foreground">
                          Inactivo
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {m.role === "owner" ? (
                        "Acceso completo al dashboard"
                      ) : (
                        <>
                          Comisión{" "}
                          <span className="font-mono font-semibold text-foreground">
                            {Number(m.commission_percentage).toFixed(0)}%
                          </span>{" "}
                          por cita completada
                        </>
                      )}
                    </p>
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
                      <DropdownMenuItem onClick={() => openEdit(m)}>
                        <Pencil className="mr-2 size-4" /> Editar
                      </DropdownMenuItem>
                      {m.role !== "owner" && (
                        <DropdownMenuItem onClick={() => toggleActive(m)}>
                          <PowerOff className="mr-2 size-4" />
                          {m.active ? "Desactivar" : "Activar"}
                        </DropdownMenuItem>
                      )}
                      {m.role !== "owner" && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => remove(m)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 size-4" /> Eliminar
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <MemberDialog
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

function MemberDialog({
  open,
  onOpenChange,
  tenantId,
  initial,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  tenantId: string
  initial: Member | null
  onSaved: (m: Member) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar miembro" : "Nuevo miembro del equipo"}</DialogTitle>
          <DialogDescription>
            Configura cómo aparecerá en las reservas y su porcentaje de comisión.
          </DialogDescription>
        </DialogHeader>
        <MemberForm
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
              <SelectItem value="staff">Entrenador</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="m-pct">Comisión</Label>
          <div className="relative">
            <Input
              id="m-pct"
              type="number"
              min={0}
              max={100}
              step="0.5"
              value={pct}
              onChange={(e) => setPct(e.target.value)}
              className="pr-7 font-mono"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
          </div>
        </div>
      </div>
      {!isOwner && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-3">
          <div>
            <p className="text-sm font-medium">Activo</p>
            <p className="text-xs text-muted-foreground">Visible al reservar y para asignar citas</p>
          </div>
          <Switch checked={active} onCheckedChange={setActive} />
        </div>
      )}
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
          {busy ? "Guardando..." : initial ? "Guardar cambios" : "Agregar al equipo"}
        </Button>
      </DialogFooter>
    </form>
  )
}
