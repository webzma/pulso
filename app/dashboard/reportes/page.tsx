import { createClient } from "@/lib/supabase/server"
import { ReportsView } from "./reports-view"
import { PageHeader } from "../_components/page-header"

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}
function isoDate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const params = await searchParams
  const today = new Date()
  const from = params.from ?? isoDate(startOfMonth(today))
  const to = params.to ?? isoDate(today)

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

  // Previous period of same length, ending the day before `from`
  const fromDate = new Date(`${from}T00:00:00-04:00`)
  const toDate = new Date(`${to}T23:59:59-04:00`)
  const periodMs = toDate.getTime() - fromDate.getTime()
  const prevEnd = new Date(fromDate.getTime() - 1)
  const prevStart = new Date(prevEnd.getTime() - periodMs)
  const prevStartIso = prevStart.toISOString()
  const prevEndIso = prevEnd.toISOString()

  const [
    { data: appts },
    { data: prevAppts },
    { data: services },
    { data: staff },
    { data: commissions },
  ] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, scheduled_at, status, price_usd, service_id, staff_member_id, created_at")
      .eq("tenant_id", tenantId)
      .gte("scheduled_at", startIso)
      .lte("scheduled_at", endIso),
    supabase
      .from("appointments")
      .select("price_usd, status, scheduled_at")
      .eq("tenant_id", tenantId)
      .gte("scheduled_at", prevStartIso)
      .lte("scheduled_at", prevEndIso),
    supabase.from("services").select("id, name").eq("tenant_id", tenantId),
    supabase.from("tenant_members").select("id, display_name").eq("tenant_id", tenantId),
    supabase
      .from("commissions")
      .select("amount_usd, paid, paid_at, staff_member_id")
      .eq("tenant_id", tenantId)
      .gte("paid_at", startIso)
      .lte("paid_at", endIso),
  ])

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Reportes"
        description="Cómo va tu negocio en el periodo seleccionado. Compara contra el periodo anterior del mismo tamaño."
      />
      <ReportsView
        from={from}
        to={to}
        appointments={(appts as any[]) ?? []}
        prevAppointments={(prevAppts as any[]) ?? []}
        services={services ?? []}
        staff={staff ?? []}
        commissionsPaid={(commissions as any[]) ?? []}
      />
    </div>
  )
}
