import { createClient } from "@/lib/supabase/server"
import { ServicesManager } from "./services-manager"

export default async function ServicesPage() {
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

  const { data: services } = await supabase
    .from("services")
    .select("id, name, category, duration_minutes, price_usd, active, created_at")
    .eq("tenant_id", tenant!.id)
    .order("created_at", { ascending: false })

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Servicios y planes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Lo que tus clientes pueden reservar desde tu URL pública.
        </p>
      </header>

      <ServicesManager tenantId={tenant!.id} initialServices={services ?? []} />
    </div>
  )
}
