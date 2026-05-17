import { createClient } from "@/lib/supabase/server"
import { ServicesManager } from "./services-manager"
import { PageHeader } from "../_components/page-header"

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
    .select("id, name, category, duration_minutes, price_usd, capacity, active, created_at")
    .eq("tenant_id", tenant!.id)
    .order("created_at", { ascending: false })

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Servicios y planes"
        description="Lo que tus clientes pueden reservar desde tu URL pública. Define duración, precio y disponibilidad."
      />
      <ServicesManager tenantId={tenant!.id} initialServices={services ?? []} />
    </div>
  )
}
