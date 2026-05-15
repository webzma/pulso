import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent } from "@/components/ui/card"
import { CalendarClock, Users, Wallet, ExternalLink, TrendingUp, Scissors, Percent, ArrowRight } from "lucide-react"
import { fetchRateFromBCV, formatUsd } from "@/lib/exchange-rate"

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

  // KPIs del día
  const today = new Date()
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString()

  const [{ count: todayCount }, { data: pendingPay }, { count: pendingApprovals }, rate] = await Promise.all([
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
    fetchRateFromBCV(),
  ])

  const owedUsd = (pendingPay ?? []).reduce((s, r) => s + Number(r.amount_usd), 0)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">Hola, {tenant!.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tu URL pública:{" "}
          <Link
            href={`/${tenant!.slug}`}
            className="inline-flex items-center gap-1 font-mono text-foreground underline underline-offset-4"
          >
            pulso.app/{tenant!.slug}
            <ExternalLink className="h-3 w-3" />
          </Link>
        </p>
      </div>

      {rate && (
        <Card className="mb-6 border-accent/30 bg-accent/5">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-accent/20">
                <TrendingUp className="h-4 w-4 text-accent-foreground" />
              </span>
              <div>
                <p className="text-xs text-muted-foreground">Tasa BCV de hoy</p>
                <p className="font-mono text-lg font-semibold">
                  Bs.{" "}
                  {rate.rate_vef.toLocaleString("es-VE", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">por USD</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Citas hoy" value={String(todayCount ?? 0)} icon={<CalendarClock className="h-5 w-5" />} />
        <Kpi label="Por confirmar" value={String(pendingApprovals ?? 0)} icon={<Users className="h-5 w-5" />} />
        <Kpi label="Comisiones por pagar" value={formatUsd(owedUsd)} icon={<Percent className="h-5 w-5" />} />
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <ActionCard
          href="/dashboard/agenda"
          icon={<CalendarClock className="h-5 w-5" />}
          title="Ver agenda de hoy"
          desc="Confirmar, completar y cobrar las citas del día."
        />
        <ActionCard
          href="/dashboard/services"
          icon={<Scissors className="h-5 w-5" />}
          title="Servicios y planes"
          desc="Mensualidades, clases, sesiones de PT."
        />
        <ActionCard
          href="/dashboard/team"
          icon={<Users className="h-5 w-5" />}
          title="Equipo"
          desc="Entrenadores y porcentaje de comisión."
        />
        <ActionCard
          href="/dashboard/caja"
          icon={<Wallet className="h-5 w-5" />}
          title="Cerrar caja"
          desc="Conciliar lo cobrado vs. lo contado."
        />
      </div>
    </div>
  )
}

function Kpi({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15 text-accent">{icon}</span>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function ActionCard({
  href,
  icon,
  title,
  desc,
}: {
  href: string
  icon: React.ReactNode
  title: string
  desc: string
}) {
  return (
    <Link href={href} className="group">
      <Card className="transition-colors group-hover:border-accent/40">
        <CardContent className="flex items-start gap-4 p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground">
            {icon}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="flex items-center justify-between gap-2 text-base font-semibold tracking-tight">
              {title}
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{desc}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
