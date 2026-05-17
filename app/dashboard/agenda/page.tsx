import { createClient } from "@/lib/supabase/server"
import { AgendaView } from "./agenda-view"
import { WeekAgendaWrapper } from "./week-agenda-wrapper"
import { fetchRateFromBCV } from "@/lib/exchange-rate"

function startOfWeekIso(date: string): { start: string; end: string } {
  const d = new Date(`${date}T12:00:00-04:00`)
  d.setHours(0, 0, 0, 0)
  const diff = d.getDay() === 0 ? 6 : d.getDay() - 1
  const monday = new Date(d)
  monday.setDate(d.getDate() - diff)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return {
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10),
  }
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: "day" | "week" }>
}) {
  const params = await searchParams
  const date = params.date ?? new Date().toISOString().slice(0, 10)
  const view = params.view === "week" ? "week" : "day"

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

  if (view === "week") {
    const { start: weekStart, end: weekEnd } = startOfWeekIso(date)
    const start = `${weekStart}T00:00:00-04:00`
    const end = `${weekEnd}T23:59:59-04:00`
    const [{ data: appts }, { data: services }] = await Promise.all([
      supabase
        .from("appointments")
        .select("id, scheduled_at, status, price_usd, client_name, service_id")
        .eq("tenant_id", tenantId)
        .gte("scheduled_at", start)
        .lte("scheduled_at", end)
        .order("scheduled_at", { ascending: true }),
      supabase.from("services").select("id, name").eq("tenant_id", tenantId),
    ])
    return (
      <WeekAgendaWrapper
        date={date}
        appointments={(appts as any[]) ?? []}
        servicesById={Object.fromEntries((services ?? []).map((s) => [s.id, s.name]))}
      />
    )
  }

  const start = `${date}T00:00:00-04:00`
  const end = `${date}T23:59:59-04:00`

  const [{ data: appts }, { data: services }, { data: staff }, rate] = await Promise.all([
    supabase
      .from("appointments")
      .select(
        "id, scheduled_at, duration_minutes, client_name, client_phone, status, price_usd, service_id, staff_member_id, notes, receipt_token",
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
