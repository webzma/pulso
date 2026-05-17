"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Bell, MessageCircle, Check, X } from "lucide-react"
import { buildBookingWhatsappLink, type NotificationRow } from "@/lib/notifications"
import { cn } from "@/lib/utils"

const KIND_LABEL: Record<NotificationRow["kind"], string> = {
  booking_created: "Reserva nueva",
  booking_confirmed: "Reserva confirmada",
  membership_expiring: "Membresía por vencer",
  membership_expired: "Membresía vencida",
}

export function NotificationsList({
  tab,
  tenantName,
  servicesById,
  items,
  queuedCount,
  sentCount,
}: {
  tab: "queued" | "sent"
  tenantName: string
  servicesById: Record<string, string>
  items: NotificationRow[]
  queuedCount: number
  sentCount: number
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)

  async function markSent(id: string, openUrl?: string) {
    setBusy(id)
    const supabase = createClient()
    await supabase
      .from("notifications")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", id)
    setBusy(null)
    if (openUrl) window.open(openUrl, "_blank", "noopener,noreferrer")
    router.refresh()
  }

  async function dismiss(id: string) {
    setBusy(id)
    const supabase = createClient()
    await supabase
      .from("notifications")
      .update({ status: "dismissed", dismissed_at: new Date().toISOString() })
      .eq("id", id)
    setBusy(null)
    router.refresh()
  }

  return (
    <>
      <Tabs value={tab} className="mb-4">
        <TabsList>
          <TabsTrigger value="queued" asChild>
            <Link href="/dashboard/notificaciones?tab=queued">
              Por enviar
              <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 font-mono text-[10px]">
                {queuedCount}
              </Badge>
            </Link>
          </TabsTrigger>
          <TabsTrigger value="sent" asChild>
            <Link href="/dashboard/notificaciones?tab=sent">
              Enviadas
              <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 font-mono text-[10px]">
                {sentCount}
              </Badge>
            </Link>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {items.length === 0 ? (
        <Empty className="border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Bell />
            </EmptyMedia>
            <EmptyTitle>
              {tab === "queued" ? "Sin notificaciones por enviar" : "Aún no has enviado ninguna"}
            </EmptyTitle>
            <EmptyDescription>
              {tab === "queued"
                ? "Cuando alguien reserve por tu URL pública, aparecerá aquí un mensaje listo para WhatsApp."
                : "Las que envíes aparecerán acá con el historial."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="grid gap-2">
          {items.map((n) => {
            const serviceName = n.payload?.service_id ? servicesById[n.payload.service_id] ?? null : null
            const link = n.channel === "whatsapp_link" ? buildBookingWhatsappLink(n, tenantName, serviceName) : null
            const when = new Date(n.created_at).toLocaleString("es-VE", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
              timeZone: "America/Caracas",
            })
            const scheduled = n.payload?.scheduled_at
              ? new Date(n.payload.scheduled_at).toLocaleString("es-VE", {
                  weekday: "short",
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                  timeZone: "America/Caracas",
                })
              : null

            return (
              <li key={n.id}>
                <Card className={cn("transition-colors", tab === "sent" && "opacity-75")}>
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                    <span
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-lg",
                        tab === "queued" ? "bg-accent/15 text-accent-foreground" : "bg-secondary",
                      )}
                    >
                      <Bell className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <p className="font-semibold tracking-tight">{n.recipient_name ?? "Cliente"}</p>
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {KIND_LABEL[n.kind]}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {scheduled && <span>Cita: {scheduled}{serviceName ? ` — ${serviceName}` : ""} · </span>}
                        Recibida {when}
                      </p>
                    </div>
                    {tab === "queued" ? (
                      <div className="flex items-center gap-2">
                        <Button size="icon" variant="ghost" onClick={() => dismiss(n.id)} disabled={busy === n.id}>
                          <X className="size-4" />
                          <span className="sr-only">Descartar</span>
                        </Button>
                        {link ? (
                          <Button size="sm" onClick={() => markSent(n.id, link)} disabled={busy === n.id}>
                            <MessageCircle />
                            Enviar WhatsApp
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => markSent(n.id)} disabled={busy === n.id}>
                            <Check />
                            Marcar enviado
                          </Button>
                        )}
                      </div>
                    ) : (
                      <Badge variant="outline" className="border-accent/40 bg-accent/15 text-accent-foreground">
                        <Check className="size-3" />
                        Enviado
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
