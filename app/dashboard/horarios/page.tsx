import { createClient } from "@/lib/supabase/server"
import { HoursManager } from "./hours-manager"
import { PageHeader } from "../_components/page-header"

export default async function HorariosPage() {
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

  const today = new Date().toISOString().slice(0, 10)

  const [{ data: hours }, { data: blocked }] = await Promise.all([
    supabase
      .from("business_hours")
      .select("id, day_of_week, opens_at, closes_at, closed, slot_minutes")
      .eq("tenant_id", tenantId)
      .order("day_of_week", { ascending: true }),
    supabase
      .from("blocked_days")
      .select("id, date, reason")
      .eq("tenant_id", tenantId)
      .gte("date", today)
      .order("date", { ascending: true }),
  ])

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Horarios y disponibilidad"
        description="Define cuándo está abierto tu gimnasio y bloquea feriados o vacaciones. Esto controla qué horas aparecen en tu URL pública."
      />
      <HoursManager tenantId={tenantId} initialHours={hours ?? []} initialBlocked={blocked ?? []} />
    </div>
  )
}
