import { createClient } from "@/lib/supabase/server"
import { NotificationsList } from "./notifications-list"
import { PageHeader } from "../_components/page-header"

export default async function NotificacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const params = await searchParams
  const tab = (params.tab ?? "queued") as "queued" | "sent"

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, name")
    .eq("owner_user_id", user!.id)
    .limit(1)
    .maybeSingle()
  const tenantId = tenant!.id

  const [{ data: notifications }, { data: services }, { data: counts }] = await Promise.all([
    supabase
      .from("notifications")
      .select(
        "id, kind, channel, recipient_phone, recipient_name, payload, status, related_appointment_id, related_membership_id, sent_at, created_at",
      )
      .eq("tenant_id", tenantId)
      .eq("status", tab)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("services").select("id, name").eq("tenant_id", tenantId),
    supabase
      .from("notifications")
      .select("status")
      .eq("tenant_id", tenantId),
  ])

  const queuedCount = (counts ?? []).filter((c) => c.status === "queued").length
  const sentCount = (counts ?? []).filter((c) => c.status === "sent").length

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Notificaciones"
        description="Avisos pendientes de enviar por WhatsApp. Cada nueva reserva genera un mensaje listo para mandar con un toque."
      />
      <NotificationsList
        tab={tab}
        tenantName={tenant!.name}
        servicesById={Object.fromEntries((services ?? []).map((s) => [s.id, s.name]))}
        items={(notifications as any[]) ?? []}
        queuedCount={queuedCount}
        sentCount={sentCount}
      />
    </div>
  )
}
