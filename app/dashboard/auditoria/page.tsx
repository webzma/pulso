import { createClient } from "@/lib/supabase/server"
import { AuditView } from "./audit-view"
import { PageHeader } from "../_components/page-header"

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; action?: string }>
}) {
  const params = await searchParams

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

  let query = supabase
    .from("audit_log")
    .select("id, actor_user_id, entity_kind, entity_id, action, details, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(200)

  if (params.kind) query = query.eq("entity_kind", params.kind)
  if (params.action) query = query.eq("action", params.action)

  const { data: rows } = await query

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Auditoría"
        description="Cambios sensibles (cancelaciones, reagendados, ediciones de precio y comisiones). Solo se registra a partir de hoy."
      />
      <AuditView entries={(rows as any[]) ?? []} kindFilter={params.kind ?? "all"} actionFilter={params.action ?? "all"} />
    </div>
  )
}
