import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  CalendarClock,
  Users,
  Wallet,
  ArrowUpRight,
  Sparkles,
  Percent,
  ExternalLink,
  ClipboardList,
  Bell,
  CalendarRange,
  Contact,
  Clock,
  AlertTriangle,
  BadgeCheck,
} from "lucide-react"
import { formatUsd } from "@/lib/exchange-rate"
import { PageHeader } from "./_components/page-header"
import { KpiCard } from "./_components/kpi-card"
import { cn } from "@/lib/utils"

function daysUntil(dateStr: string) {
  const target = new Date(dateStr + "T00:00:00")
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, name, slug")
    .eq("owner_user_id", user!.id)
    .limit(1)
    .maybeSingle()

  const tenantId = tenant!.id

  // Auto-expire any past memberships before reading state
  await supabase.rpc("expire_past_memberships")

  const today = new Date()
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString()

  const [
    { count: todayCount },
    { data: pendingPay },
    { count: pendingApprovals },
    { data: completedToday },
    { count: queuedNotifications },
    { data: expiringMemberships },
  ] = await Promise.all([
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .gte("scheduled_at", startOfDay)
      .lt("scheduled_at", endOfDay),
    supabase.from("commissions").select("amount_usd").eq("tenant_id", tenantId).eq("paid", false),
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("status", "pending"),
    supabase
      .from("appointments")
      .select("price_usd")
      .eq("tenant_id", tenantId)
      .eq("status", "completed")
      .gte("scheduled_at", startOfDay)
      .lt("scheduled_at", endOfDay),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("status", "queued"),
    supabase
      .from("client_memberships")
      .select(
        "id, ends_at, sessions_remaining, client:clients(id, name), plan:membership_plans(name, kind)",
      )
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .order("ends_at", { ascending: true, nullsFirst: false })
      .limit(20),
  ])

  const owedUsd = (pendingPay ?? []).reduce((s, r) => s + Number(r.amount_usd), 0)
  const revenueToday = (completedToday ?? []).reduce((s, r) => s + Number(r.price_usd), 0)

  const expiringSoon = ((expiringMemberships as any[]) ?? []).filter((m) => {
    if (m.plan?.kind === "pass_pack") return (m.sessions_remaining ?? 0) <= 2
    if (m.ends_at) return daysUntil(m.ends_at) <= 7
    return false
  })

  const hasAlerts = (queuedNotifications ?? 0) > 0 || expiringSoon.length > 0

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={`Hola, ${tenant!.name.split(" ")[0]}`}
        description="Resumen rápido de tu día. Todo lo que necesitas para operar tu gimnasio hoy."
        actions={
          <Link
            href={`/${tenant!.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium transition-colors hover:border-accent hover:text-foreground"
          >
            <span className="font-mono text-muted-foreground">pulso.app/{tenant!.slug}</span>
            <ExternalLink className="size-3" />
          </Link>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Citas hoy"
          value={String(todayCount ?? 0)}
          icon={<CalendarClock className="size-4" />}
          hint="Total agendado para hoy"
        />
        <KpiCard
          label="Ingresos del día"
          value={formatUsd(revenueToday)}
          icon={<Wallet className="size-4" />}
          hint="Suma de citas completadas"
          accent
        />
        <KpiCard
          label="Por confirmar"
          value={String(pendingApprovals ?? 0)}
          icon={<ClipboardList className="size-4" />}
          hint="Reservas pendientes de revisión"
        />
        <KpiCard
          label="Comisiones por pagar"
          value={formatUsd(owedUsd)}
          icon={<Percent className="size-4" />}
          hint="Acumulado al equipo"
        />
      </section>

      {hasAlerts && (
        <section className="mt-8">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
            <h2 className="text-sm font-medium text-foreground">Requiere tu atención</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {(queuedNotifications ?? 0) > 0 && (
              <Link href="/dashboard/notificaciones">
                <Card className="group border-amber-500/40 bg-amber-500/5 transition-colors hover:border-amber-500/60">
                  <CardContent className="flex items-center gap-3 p-4">
                    <span className="flex size-10 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300">
                      <Bell className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold tracking-tight">
                        {queuedNotifications} notificación{queuedNotifications === 1 ? "" : "es"} por enviar
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Mensajes de WhatsApp listos para mandar a tus clientes.
                      </p>
                    </div>
                    <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </CardContent>
                </Card>
              </Link>
            )}
            {expiringSoon.length > 0 && (
              <Link href="/dashboard/membresias">
                <Card className="group border-amber-500/40 bg-amber-500/5 transition-colors hover:border-amber-500/60">
                  <CardContent className="flex items-center gap-3 p-4">
                    <span className="flex size-10 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300">
                      <BadgeCheck className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold tracking-tight">
                        {expiringSoon.length} membresía{expiringSoon.length === 1 ? "" : "s"} por vencer
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {expiringSoon
                          .slice(0, 3)
                          .map((m) => m.client?.name ?? "Cliente")
                          .join(", ")}
                        {expiringSoon.length > 3 && ` y ${expiringSoon.length - 3} más`}
                      </p>
                    </div>
                    <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </CardContent>
                </Card>
              </Link>
            )}
          </div>
        </section>
      )}

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Accesos rápidos</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ActionCard
            href="/dashboard/agenda"
            icon={<CalendarClock className="size-4" />}
            title="Agenda de hoy"
            desc="Confirma, cobra y completa las citas del día."
            badge={pendingApprovals ? `${pendingApprovals} pendiente${pendingApprovals === 1 ? "" : "s"}` : undefined}
          />
          <ActionCard
            href="/dashboard/clientes"
            icon={<Contact className="size-4" />}
            title="Clientes"
            desc="Busca por teléfono, ve historial y vende planes."
          />
          <ActionCard
            href="/dashboard/membresias"
            icon={<BadgeCheck className="size-4" />}
            title="Membresías"
            desc="Activas, por vencer y vencidas."
          />
          <ActionCard
            href="/dashboard/caja"
            icon={<Wallet className="size-4" />}
            title="Cerrar caja"
            desc="Concilia lo cobrado con tu conteo físico al final del día."
          />
          <ActionCard
            href="/dashboard/comisiones"
            icon={<Percent className="size-4" />}
            title="Comisiones"
            desc="Cuánto le debes a cada entrenador esta semana."
            badge={owedUsd > 0 ? formatUsd(owedUsd) : undefined}
          />
          <ActionCard
            href="/dashboard/horarios"
            icon={<Clock className="size-4" />}
            title="Horarios"
            desc="Configura cuándo está abierto y bloquea feriados."
          />
          <ActionCard
            href="/dashboard/services"
            icon={<Sparkles className="size-4" />}
            title="Servicios"
            desc="Sesiones individuales y clases grupales."
          />
          <ActionCard
            href="/dashboard/planes"
            icon={<CalendarRange className="size-4" />}
            title="Planes y mensualidades"
            desc="Define mensualidades y paquetes de sesiones."
          />
          <ActionCard
            href="/dashboard/team"
            icon={<Users className="size-4" />}
            title="Equipo"
            desc="Agrega entrenadores y configura sus comisiones."
          />
        </div>
      </section>
    </div>
  )
}

function ActionCard({
  href,
  icon,
  title,
  desc,
  badge,
  external,
}: {
  href: string
  icon: React.ReactNode
  title: string
  desc: string
  badge?: string
  external?: boolean
}) {
  return (
    <Link href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined}>
      <Card className="group h-full transition-colors hover:border-foreground/20">
        <CardContent className="flex h-full flex-col gap-3 p-5">
          <div className="flex items-center justify-between">
            <span className="flex size-9 items-center justify-center rounded-lg bg-secondary text-foreground transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
              {icon}
            </span>
            <ArrowUpRight className={cn(
              "size-4 text-muted-foreground transition-all",
              "group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground",
            )} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold tracking-tight">{title}</h3>
              {badge && (
                <Badge variant="secondary" className="font-mono text-[10px]">
                  {badge}
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{desc}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
