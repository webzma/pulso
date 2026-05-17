import { toWhatsappNumber } from "@/lib/phone"

export type NotificationPayload = {
  scheduled_at?: string
  duration_minutes?: number
  service_id?: string
  price_usd?: number
}

export type NotificationRow = {
  id: string
  kind: "booking_created" | "booking_confirmed" | "membership_expiring" | "membership_expired"
  channel: "whatsapp_link" | "in_app"
  recipient_phone: string | null
  recipient_name: string | null
  payload: NotificationPayload
  status: "queued" | "sent" | "dismissed"
  related_appointment_id: string | null
  related_membership_id: string | null
  sent_at: string | null
  created_at: string
}

export function buildBookingWhatsappLink(
  n: NotificationRow,
  tenantName: string,
  serviceName: string | null,
): string | null {
  if (!n.recipient_phone) return null
  const scheduled = n.payload?.scheduled_at
  const dateTime = scheduled
    ? new Date(scheduled).toLocaleString("es-VE", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "America/Caracas",
      })
    : "tu cita"
  const text =
    `Hola ${n.recipient_name ?? ""}, te confirmamos desde ${tenantName}.\n\n` +
    `${serviceName ?? "Servicio"} — ${dateTime}.\n\n` +
    `Si necesitas reagendar, responde a este chat.`
  return `https://wa.me/${toWhatsappNumber(n.recipient_phone)}?text=${encodeURIComponent(text)}`
}
