import { createClient } from "@/lib/supabase/server"
import { CommissionsView } from "./commissions-view"

export default async function ComisionesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const params = await searchParams
  const today = new Date()
  const sevenAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  const from = params.from ?? sevenAgo.toISOString().slice(0, 10)
  const to = params.to ?? today.toISOString().slice(0, 10)

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

  const startIso = `${from}T00:00:00-04:00`
  const endIso = `${to}T23:59:59-04:00`

  const { data: rows } = await supabase
    .from("commissions")
    .select(
      "id, amount_usd, service_amount_usd, commission_percentage, paid, paid_at, created_at, staff_member_id, appointment_id, appointments!inner(scheduled_at, client_name, service_id, services(name))",
    )
    .eq("tenant_id", tenantId)
    .gte("appointments.scheduled_at", startIso)
    .lte("appointments.scheduled_at", endIso)
    .order("created_at", { ascending: false })

  const { data: staff } = await supabase
    .from("tenant_members")
    .select("id, display_name")
    .eq("tenant_id", tenantId)

  return (
    <CommissionsView
      tenantId={tenantId}
      userId={user!.id}
      from={from}
      to={to}
      rows={(rows as any[]) ?? []}
      staff={staff ?? []}
    />
  )
}
