import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ClientDetail } from "./client-detail"

export default async function ClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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

  const { data: client } = await supabase
    .from("clients")
    .select("id, name, phone, email, notes, created_at")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .maybeSingle()

  if (!client) notFound()

  const [{ data: appointments }, { data: memberships }, { data: plans }] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, scheduled_at, duration_minutes, status, price_usd, service:services(name), staff:tenant_members(display_name)")
      .eq("tenant_id", tenantId)
      .eq("client_id", id)
      .order("scheduled_at", { ascending: false })
      .limit(50),
    supabase
      .from("client_memberships")
      .select("id, starts_at, ends_at, sessions_total, sessions_remaining, status, price_usd_paid, plan:membership_plans(id, name, kind)")
      .eq("tenant_id", tenantId)
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("membership_plans")
      .select("id, name, kind, duration_days, sessions_count, price_usd")
      .eq("tenant_id", tenantId)
      .eq("active", true)
      .order("name", { ascending: true }),
  ])

  return (
    <ClientDetail
      tenantId={tenantId}
      client={client}
      appointments={(appointments as any[]) ?? []}
      memberships={(memberships as any[]) ?? []}
      plans={plans ?? []}
    />
  )
}
