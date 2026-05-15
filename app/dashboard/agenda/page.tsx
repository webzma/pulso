import { createClient } from "@/lib/supabase/server"
import { AgendaView } from "./agenda-view"
import { fetchRateFromBCV } from "@/lib/exchange-rate"

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const params = await searchParams
  const date = params.date ?? new Date().toISOString().slice(0, 10) // YYYY-MM-DD

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

  // Bounds in Caracas time (UTC-4, no DST)
  const start = `${date}T00:00:00-04:00`
  const end = `${date}T23:59:59-04:00`

  const [{ data: appts }, { data: services }, { data: staff }, rate] = await Promise.all([
    supabase
      .from("appointments")
      .select(
        "id, scheduled_at, duration_minutes, client_name, client_phone, status, price_usd, service_id, staff_member_id, notes",
      )
      .eq("tenant_id", tenantId)
      .gte("scheduled_at", start)
      .lte("scheduled_at", end)
      .order("scheduled_at", { ascending: true }),
    supabase.from("services").select("id, name, duration_minutes, price_usd").eq("tenant_id", tenantId),
    supabase
      .from("tenant_members")
      .select("id, display_name")
      .eq("tenant_id", tenantId)
      .eq("active", true),
    fetchRateFromBCV(),
  ])

  return (
    <AgendaView
      tenantId={tenantId}
      date={date}
      initialAppointments={appts ?? []}
      services={services ?? []}
      staff={staff ?? []}
      currentRate={rate?.rate_vef ?? null}
    />
  )
}
