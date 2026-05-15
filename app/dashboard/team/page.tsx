import { createClient } from "@/lib/supabase/server"
import { TeamManager } from "./team-manager"

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
    .select("id, display_name, role, commission_percentage, active, user_id, created_at")
    .eq("tenant_id", tenant!.id)
    .order("created_at", { ascending: true })

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Equipo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Entrenadores y staff. Su porcentaje aplica a cada cita que completen.
        </p>
      </header>
      <TeamManager tenantId={tenant!.id} initialMembers={members ?? []} />
    </div>
  )
}
