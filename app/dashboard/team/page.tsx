import { createClient } from "@/lib/supabase/server"
import { TeamManager } from "./team-manager"
import { PageHeader } from "../_components/page-header"

export default async function TeamPage() {
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

  const { data: members } = await supabase
    .from("tenant_members")
    .select("id, display_name, role, commission_percentage, active, user_id, avatar_url, created_at")
    .eq("tenant_id", tenant!.id)
    .order("created_at", { ascending: true })

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Equipo"
        description="Entrenadores y staff de tu gimnasio. Su porcentaje aplica a cada cita que completen."
      />
      <TeamManager tenantId={tenant!.id} initialMembers={members ?? []} />
    </div>
  )
}
