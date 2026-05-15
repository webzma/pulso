import { createClient } from "@/lib/supabase/server"
import { CashCloseView } from "./cash-close-view"
import { fetchRateFromBCV } from "@/lib/exchange-rate"

const METHOD_FIELD: Record<string, string> = {
  cash_usd: "cash_usd",
  cash_vef: "cash_vef",
  pago_movil: "pago_movil",
  zelle: "zelle",
  binance: "binance",
  transfer_usd: "other",
  other: "other",
}

export default async function CajaPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const params = await searchParams
  const date = params.date ?? new Date().toISOString().slice(0, 10)

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

  const start = `${date}T00:00:00-04:00`
  const end = `${date}T23:59:59-04:00`

  // System totals: sum of completed appointments' payments today
  const { data: payments } = await supabase
    .from("appointment_payments")
    .select("method, amount_original, amount_usd, currency, appointment_id, appointments!inner(scheduled_at, status, tenant_id)")
    .eq("tenant_id", tenantId)
    .gte("appointments.scheduled_at", start)
    .lte("appointments.scheduled_at", end)
    .eq("appointments.status", "completed")

  const systemTotals = {
    cash_usd: 0,
    cash_vef: 0,
    pago_movil: 0,
    zelle: 0,
    binance: 0,
    other: 0,
  }
  let systemUsdTotal = 0
  for (const p of payments ?? []) {
    const field = METHOD_FIELD[p.method as string] ?? "other"
    if (field === "cash_vef" || field === "pago_movil") {
      systemTotals[field as keyof typeof systemTotals] += Number(p.amount_original)
    } else {
      systemTotals[field as keyof typeof systemTotals] += Number(p.amount_usd)
    }
    systemUsdTotal += Number(p.amount_usd)
  }

  // Existing close for that date (if any)
  const { data: existing } = await supabase
    .from("cash_registers")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("business_date", date)
    .maybeSingle()

  const rate = await fetchRateFromBCV()

  return (
    <CashCloseView
      tenantId={tenantId}
      userId={user!.id}
      date={date}
      systemTotals={systemTotals}
      systemUsdTotal={systemUsdTotal}
      existing={existing ?? null}
      currentRate={rate?.rate_vef ?? null}
    />
  )
}
