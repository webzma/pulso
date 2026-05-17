import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "../_components/page-header"
import { KpiCard } from "../_components/kpi-card"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { BadgeCheck, AlertTriangle, CalendarRange, ChevronRight } from "lucide-react"
import { formatUsd } from "@/lib/exchange-rate"
import { cn } from "@/lib/utils"

type Status = "active" | "expired" | "cancelled" | "pending"

type Row = {
  id: string
  starts_at: string
  ends_at: string | null
  sessions_total: number | null
  sessions_remaining: number | null
  status: Status
  price_usd_paid: number | null
  client: { id: string; name: string; phone: string } | null
  plan: { name: string; kind: "monthly" | "pass_pack" | "day_pass" } | null
}

function dateLabel(d: string) {
  return new Date(d).toLocaleDateString("es-VE", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Caracas" })
}

function daysUntil(dateStr: string) {
  const target = new Date(dateStr + "T00:00:00")
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

export default async function MembresiasPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("owner_user_id", user!.id)
    .limit(1)
    .maybeSingle()
  const tenantId = tenant!.id

  await supabase.rpc("expire_past_memberships")

  const { data: rows } = await supabase
    .from("client_memberships")
    .select(
      "id, starts_at, ends_at, sessions_total, sessions_remaining, status, price_usd_paid, " +
        "client:clients(id, name, phone), plan:membership_plans(name, kind)",
    )
    .eq("tenant_id", tenantId)
    .order("ends_at", { ascending: true, nullsFirst: false })

  const all = (rows as any as Row[]) ?? []
  const active = all.filter((r) => r.status === "active")
  const expiringSoon = active.filter((r) => {
    if (r.plan?.kind === "pass_pack") return (r.sessions_remaining ?? 0) <= 2
    if (r.ends_at) return daysUntil(r.ends_at) <= 7
    return false
  })
  const expired = all.filter((r) => r.status === "expired")

  const revenue = all.reduce((s, r) => s + Number(r.price_usd_paid ?? 0), 0)

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Membresías"
        description="Todas las mensualidades, paquetes y pases vendidos. Las que están por vencer aparecen al inicio."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <KpiCard label="Activas" value={String(active.length)} accent />
        <KpiCard label="Por vencer" value={String(expiringSoon.length)} hint="≤7 días o ≤2 sesiones" />
        <KpiCard label="Vencidas" value={String(expired.length)} />
        <KpiCard label="Vendido (total)" value={formatUsd(revenue)} />
      </div>

      {expiringSoon.length > 0 && (
        <>
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
            <h2 className="text-sm font-medium text-foreground">Por vencer</h2>
          </div>
          <ul className="mb-6 grid gap-2">
            {expiringSoon.map((r) => (
              <MembershipRow key={r.id} row={r} highlight />
            ))}
          </ul>
        </>
      )}

      <h2 className="mb-2 text-sm font-medium text-muted-foreground">Activas</h2>
      {active.length === 0 ? (
        <Empty className="border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BadgeCheck />
            </EmptyMedia>
            <EmptyTitle>Sin membresías activas</EmptyTitle>
            <EmptyDescription>
              Vende un plan desde la ficha de un cliente. Si aún no tienes planes definidos, créalos en{" "}
              <Link href="/dashboard/planes" className="underline">
                Planes
              </Link>
              .
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="mb-8 grid gap-2">
          {active
            .filter((r) => !expiringSoon.includes(r))
            .map((r) => (
              <MembershipRow key={r.id} row={r} />
            ))}
        </ul>
      )}

      {expired.length > 0 && (
        <>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Vencidas</h2>
          <ul className="grid gap-2">
            {expired.map((r) => (
              <MembershipRow key={r.id} row={r} muted />
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

function MembershipRow({
  row,
  highlight,
  muted,
}: {
  row: Row
  highlight?: boolean
  muted?: boolean
}) {
  const remainingLabel =
    row.plan?.kind === "pass_pack"
      ? `${row.sessions_remaining ?? 0} / ${row.sessions_total ?? 0} sesiones`
      : row.ends_at
        ? `vence ${dateLabel(row.ends_at)}${
            row.status === "active" ? ` · en ${daysUntil(row.ends_at)} días` : ""
          }`
        : ""

  const content = (
    <Card
      className={cn(
        "transition-colors hover:border-foreground/20",
        highlight && "border-amber-500/40 bg-amber-500/5",
        muted && "opacity-70",
      )}
    >
      <CardContent className="flex items-center gap-3 p-3">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg",
            highlight ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" : "bg-secondary",
          )}
        >
          <CalendarRange className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <p className="truncate font-semibold tracking-tight">{row.client?.name ?? "Cliente"}</p>
            <Badge variant="outline" className="text-[10px] uppercase">
              {row.plan?.name ?? "Plan"}
            </Badge>
            {row.status === "expired" && (
              <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive text-[10px] uppercase">
                Vencida
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{remainingLabel}</p>
        </div>
        <p className="hidden font-mono text-sm font-semibold tabular-nums sm:block">
          {formatUsd(Number(row.price_usd_paid ?? 0))}
        </p>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </CardContent>
    </Card>
  )

  return (
    <li>
      {row.client ? (
        <Link href={`/dashboard/clientes/${row.client.id}`}>{content}</Link>
      ) : (
        content
      )}
    </li>
  )
}
