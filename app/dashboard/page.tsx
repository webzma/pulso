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
} from "lucide-react"
import { formatUsd } from "@/lib/exchange-rate"
import { PageHeader } from "./_components/page-header"
import { KpiCard } from "./_components/kpi-card"

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

  const today = new Date()
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString()

  const [{ count: todayCount }, { data: pendingPay }, { count: pendingApprovals }, { data: completedToday }] =
    await Promise.all([
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
    ])

  const owedUsd = (pendingPay ?? []).reduce((s, r) => s + Number(r.amount_usd), 0)
  const revenueToday = (completedToday ?? []).reduce((s, r) => s + Number(r.price_usd), 0)

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
            href="/dashboard/services"
            icon={<Sparkles className="size-4" />}
            title="Servicios y planes"
            desc="Define mensualidades, clases y entrenamientos."
          />
          <ActionCard
            href="/dashboard/team"
            icon={<Users className="size-4" />}
            title="Equipo"
            desc="Agrega entrenadores y configura sus comisiones."
          />
          <ActionCard
            href={`/${tenant!.slug}`}
            external
            icon={<ExternalLink className="size-4" />}
            title="Ver URL pública"
            desc="Comparte este enlace por WhatsApp para recibir reservas."
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
            <ArrowUpRight className="size-4 text-muted-foreground transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
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
