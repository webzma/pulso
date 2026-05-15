import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LogoutButton } from "./logout-button"
import { Dumbbell, CalendarClock, Users, Wallet, ExternalLink, TrendingUp } from "lucide-react"
import { fetchRateFromBCV } from "@/lib/exchange-rate"

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, name, slug, business_type")
    .eq("owner_user_id", user.id)
    .limit(1)
    .maybeSingle()

  if (!tenant) redirect("/onboarding")

  const rate = await fetchRateFromBCV()

  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Dumbbell className="h-4 w-4" />
            </span>
            <span className="text-base tracking-tight">{tenant.name}</span>
          </Link>
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Panel</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tu URL pública:{" "}
            <Link
              href={`/${tenant.slug}`}
              className="inline-flex items-center gap-1 font-mono text-foreground underline underline-offset-4"
            >
              pulso.app/{tenant.slug}
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

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            icon={<CalendarClock className="h-5 w-5" />}
            title="Agenda de hoy"
            desc="Próximamente: timeline diaria con citas arrastrables."
          />
          <StatCard
            icon={<Users className="h-5 w-5" />}
            title="Equipo y comisiones"
            desc="Próximamente: entrenadores, porcentajes y pagos de comisión."
          />
          <StatCard
            icon={<Wallet className="h-5 w-5" />}
            title="Cierre de caja"
            desc="Próximamente: conciliación diaria por método de pago."
          />
        </div>

        <div className="mt-8 rounded-xl border border-dashed border-border bg-card/40 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Esta es la base de tu panel. Las pantallas de agenda, equipo, planes y caja se construirán en las
            próximas iteraciones.
          </p>
        </div>
      </main>
    </div>
  )
}

function StatCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Card>
      <CardContent className="flex items-start gap-4 p-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent-foreground">
          <span className="text-accent">{icon}</span>
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-semibold tracking-tight">{title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{desc}</p>
        </div>
      </CardContent>
    </Card>
  )
}
