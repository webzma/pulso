"use client"

import { useState, useTransition } from "react"
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
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Plus, Search, Users, Phone, ChevronRight, CalendarDays, BadgeCheck } from "lucide-react"
import { formatVePhone, isValidVePhone } from "@/lib/phone"

type Membership = {
  id: string
  status: "active" | "expired" | "cancelled" | "pending"
  ends_at: string | null
  sessions_remaining: number | null
  plan: { name: string; kind: "monthly" | "pass_pack" | "day_pass" } | null
}

type Client = {
  id: string
  name: string
  phone: string
  email: string | null
  notes: string | null
  created_at: string
  appointments: { count: number }[]
  client_memberships: Membership[]
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

function activeMembership(c: Client): Membership | null {
  return c.client_memberships?.find((m) => m.status === "active") ?? null
}

export function ClientsManager({
  tenantId,
  initialClients,
  initialQuery,
}: {
  tenantId: string
  initialClients: Client[]
  initialQuery: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [q, setQ] = useState(initialQuery)
  const [creating, setCreating] = useState(false)

  function submitSearch(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (q.trim()) params.set("q", q.trim())
    startTransition(() => {
      router.push(`/dashboard/clientes${params.toString() ? `?${params.toString()}` : ""}`)
    })
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <form onSubmit={submitSearch} className="flex flex-1 items-end gap-2">
          <div className="grid flex-1 gap-1.5">
            <Label htmlFor="search" className="text-xs uppercase tracking-wider text-muted-foreground">
              Buscar
            </Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Nombre o teléfono..."
                className="pl-9"
              />
            </div>
          </div>
          <Button type="submit" variant="outline" disabled={pending}>
            {pending ? "Buscando..." : "Buscar"}
          </Button>
        </form>
        <Button onClick={() => setCreating(true)}>
          <Plus />
          Nuevo cliente
        </Button>
      </div>

      {initialClients.length === 0 ? (
        <Empty className="border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users />
            </EmptyMedia>
            <EmptyTitle>
              {initialQuery ? `Sin resultados para "${initialQuery}"` : "Sin clientes todavía"}
            </EmptyTitle>
            <EmptyDescription>
              {initialQuery
                ? "Prueba con otro nombre o teléfono."
                : "Los clientes se registran solos cuando reservan desde tu URL pública. También puedes agregarlos manualmente."}
            </EmptyDescription>
          </EmptyHeader>
          {!initialQuery && (
            <Button onClick={() => setCreating(true)}>
              <Plus />
              Agregar cliente
            </Button>
          )}
        </Empty>
      ) : (
        <ul className="grid gap-2">
          {initialClients.map((c) => {
            const m = activeMembership(c)
            const total = c.appointments?.[0]?.count ?? 0
            return (
              <li key={c.id}>
                <Link href={`/dashboard/clientes/${c.id}`}>
                  <Card className="group transition-colors hover:border-foreground/20">
                    <CardContent className="flex items-center gap-3 p-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold">
                        {initials(c.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <p className="truncate font-semibold tracking-tight">{c.name}</p>
                          {m && (
                            <Badge variant="outline" className="border-accent/40 bg-accent/15 text-[10px] uppercase">
                              <BadgeCheck className="size-3" />
                              {m.plan?.name ?? "Plan activo"}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1 font-mono">
                            <Phone className="size-3" />
                            {formatVePhone(c.phone)}
                          </span>
                          {total > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <CalendarDays className="size-3" />
                              {total} cita{total === 1 ? "" : "s"}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </CardContent>
                  </Card>
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      {creating && (
        <NewClientDialog
          tenantId={tenantId}
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false)
            router.push(`/dashboard/clientes/${id}`)
          }}
        />
      )}
    </>
  )
}

function NewClientDialog({
  tenantId,
  onClose,
  onCreated,
}: {
  tenantId: string
  onClose: () => void
  onCreated: (id: string) => void
}) {
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [notes, setNotes] = useState("")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    if (!isValidVePhone(phone)) {
      setErr("Teléfono inválido. Usa formato 0412/0414/0416/0424/0426 con 11 dígitos.")
      return
    }
    setBusy(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from("clients")
      .insert({
        tenant_id: tenantId,
        name: name.trim(),
        phone: phone.replace(/\D/g, ""),
        email: email.trim() || null,
        notes: notes.trim() || null,
      })
      .select("id")
      .single()
    setBusy(false)
    if (error) {
      setErr(error.message.includes("clients_phone_per_tenant") ? "Ya existe un cliente con ese teléfono." : error.message)
      return
    }
    onCreated(data.id)
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo cliente</DialogTitle>
          <DialogDescription>El teléfono es la clave única — sirve para enviar WhatsApp y vincular reservas.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="c-name">Nombre completo</Label>
            <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="c-phone">Teléfono (WhatsApp)</Label>
            <Input
              id="c-phone"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
              placeholder="04141234567"
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="c-email">Email (opcional)</Label>
            <Input id="c-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="c-notes">Notas (opcional)</Label>
            <Input id="c-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
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
              {busy ? "Guardando..." : "Crear cliente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
