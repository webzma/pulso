import { createClient } from "@/lib/supabase/server"
import { ClientsManager } from "./clients-manager"
import { PageHeader } from "../_components/page-header"

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const params = await searchParams
  const q = (params.q ?? "").trim()

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
    .from("clients")
    .select(
      "id, name, phone, email, notes, created_at, " +
        "appointments(count), " +
        "client_memberships(id, status, ends_at, sessions_remaining, plan:membership_plans(name, kind))",
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(100)

  if (q) {
    const digits = q.replace(/\D/g, "")
    if (digits.length >= 3) {
      query = query.or(`name.ilike.%${q}%,phone.ilike.%${digits}%`)
    } else {
      query = query.ilike("name", `%${q}%`)
    }
  }

  const { data: clients } = await query

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Clientes"
        description="Base de datos de personas que han pasado por tu gimnasio. Búsqueda por nombre o teléfono."
      />
      <ClientsManager tenantId={tenantId} initialClients={(clients as any[]) ?? []} initialQuery={q} />
    </div>
  )
}
