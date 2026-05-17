import { createClient } from "@/lib/supabase/server"
import { PlansManager } from "./plans-manager"
import { PageHeader } from "../_components/page-header"

export default async function PlanesPage() {
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

  const { data: plans } = await supabase
    .from("membership_plans")
    .select("id, name, description, kind, duration_days, sessions_count, price_usd, active, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Planes y mensualidades"
        description="Define mensualidades, paquetes de sesiones y pases diarios. Estos planes aparecen para venta en tu URL pública."
      />
      <PlansManager tenantId={tenantId} initialPlans={plans ?? []} />
    </div>
  )
}
