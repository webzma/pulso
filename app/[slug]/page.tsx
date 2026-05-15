import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { BookingFlow } from "./booking-flow"
import { Dumbbell, MapPin, Phone } from "lucide-react"

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data: tenant } = await supabase
    .from("tenants")
    .select("name, business_type")
    .eq("slug", slug)
    .maybeSingle()

  if (!tenant) return { title: "No encontrado" }
  return {
    title: `Reservar en ${tenant.name}`,
    description: `Reserva tu próxima clase o sesión en ${tenant.name}.`,
  }
}

export default async function PublicBookingPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, slug, name, business_type, phone, address, logo_url, status")
    .eq("slug", slug)
    .maybeSingle()

  if (!tenant || !["active", "trial"].includes(tenant.status)) {
    notFound()
  }

  const [{ data: services }, { data: staff }] = await Promise.all([
    supabase
      .from("services")
      .select("id, name, category, duration_minutes, price_usd")
      .eq("tenant_id", tenant.id)
      .eq("active", true)
      .order("name", { ascending: true }),
    supabase
      .from("tenant_members")
      .select("id, display_name, role")
      .eq("tenant_id", tenant.id)
      .eq("active", true)
      .order("display_name", { ascending: true }),
  ])

  return (
    <div className="min-h-svh bg-background">
      {/* Header tenant */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Dumbbell className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold tracking-tight text-foreground">{tenant.name}</h1>
            <p className="text-xs text-muted-foreground">
              {tenant.business_type === "gimnasio"
                ? "Gimnasio"
                : tenant.business_type === "crossfit"
                  ? "CrossFit / funcional"
                  : tenant.business_type === "estudio"
                    ? "Estudio fitness"
                    : "Centro deportivo"}
            </p>
          </div>
        </div>
        {(tenant.phone || tenant.address) && (
          <div className="mx-auto flex max-w-2xl flex-wrap gap-x-4 gap-y-1 border-t border-border bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
            {tenant.phone && (
              <span className="inline-flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                {tenant.phone}
              </span>
            )}
            {tenant.address && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {tenant.address}
              </span>
            )}
          </div>
        )}
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        <BookingFlow
          tenant={{ id: tenant.id, name: tenant.name, slug: tenant.slug, phone: tenant.phone }}
          services={services ?? []}
          staff={staff ?? []}
        />
      </main>

      <footer className="mx-auto max-w-2xl px-4 py-8 text-center text-xs text-muted-foreground">
        Reservas gestionadas con <span className="font-medium text-foreground">Pulso</span>
      </footer>
    </div>
  )
}
