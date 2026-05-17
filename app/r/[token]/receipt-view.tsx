"use client"

import { Button } from "@/components/ui/button"
import { Dumbbell, Printer, MapPin, Phone } from "lucide-react"
import { formatUsd, formatVef } from "@/lib/exchange-rate"

const METHOD_LABEL: Record<string, string> = {
  cash_usd: "Efectivo USD",
  cash_vef: "Efectivo Bs.",
  pago_movil: "Pago Móvil",
  zelle: "Zelle",
  binance: "Binance",
  transfer_usd: "Transferencia USD",
  other: "Otro",
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  completed: "Pagada",
  cancelled: "Cancelada",
  no_show: "No asistió",
}

export function ReceiptView({ data }: { data: any }) {
  const { appointment, service, staff, tenant, payments } = data
  const scheduledDate = new Date(appointment.scheduled_at).toLocaleString("es-VE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Caracas",
  })
  const issuedDate = new Date(appointment.created_at).toLocaleDateString("es-VE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })

  const totalUsd = payments.reduce((s: number, p: any) => s + Number(p.amount_usd), 0)

  return (
    <div className="min-h-svh bg-muted/40 py-6 print:bg-white print:py-0">
      <div className="mx-auto max-w-2xl px-4 print:px-0">
        <div className="mb-4 flex items-center justify-between gap-2 print:hidden">
          <a href="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Volver
          </a>
          <Button size="sm" onClick={() => window.print()}>
            <Printer />
            Imprimir / guardar PDF
          </Button>
        </div>

        <article className="overflow-hidden rounded-xl border border-border bg-card print:border-0 print:rounded-none">
          {/* Header */}
          <header className="border-b border-border bg-secondary/40 px-6 py-5 print:bg-white">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <Dumbbell className="size-5" />
                </span>
                <div>
                  <h1 className="text-xl font-semibold tracking-tight">{tenant.name}</h1>
                  <p className="text-xs text-muted-foreground">
                    {tenant.business_type === "gimnasio"
                      ? "Gimnasio"
                      : tenant.business_type === "crossfit"
                        ? "CrossFit / funcional"
                        : tenant.business_type === "estudio"
                          ? "Estudio fitness"
                          : "Centro deportivo"}
                  </p>
                </div>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p className="font-mono">#{appointment.id.slice(0, 8)}</p>
                <p className="mt-0.5">{issuedDate}</p>
              </div>
            </div>
            {(tenant.phone || tenant.address) && (
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {tenant.phone && (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="size-3" />
                    {tenant.phone}
                  </span>
                )}
                {tenant.address && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-3" />
                    {tenant.address}
                  </span>
                )}
              </div>
            )}
          </header>

          {/* Title */}
          <div className="border-b border-border px-6 py-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Comprobante</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">
              {STATUS_LABEL[appointment.status] ?? appointment.status}
            </h2>
          </div>

          {/* Details grid */}
          <section className="grid gap-4 border-b border-border px-6 py-5 sm:grid-cols-2">
            <Field label="Cliente" value={appointment.client_name} />
            <Field label="Teléfono" value={appointment.client_phone} mono />
            <Field label="Servicio" value={service.name} />
            <Field label="Profesional" value={staff?.display_name ?? "Sin asignar"} />
            <Field label="Fecha y hora" value={scheduledDate} className="sm:col-span-2 capitalize" />
            <Field label="Duración" value={`${appointment.duration_minutes} minutos`} />
            {appointment.rate_vef_snapshot && (
              <Field
                label="Tasa USD/Bs."
                value={`Bs. ${Number(appointment.rate_vef_snapshot).toLocaleString("es-VE")}`}
                mono
              />
            )}
          </section>

          {/* Payments */}
          {payments.length > 0 && (
            <section className="border-b border-border px-6 py-5">
              <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Pagos</p>
              <ul className="divide-y divide-border">
                {payments.map((p: any, i: number) => (
                  <li key={i} className="flex items-baseline justify-between gap-2 py-2 text-sm">
                    <div>
                      <p className="font-medium">{METHOD_LABEL[p.method] ?? p.method}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.currency === "USD"
                          ? formatUsd(Number(p.amount_original))
                          : formatVef(Number(p.amount_original))}
                        {p.currency === "VEF" && p.rate_vef_used && (
                          <span> · tasa Bs. {Number(p.rate_vef_used).toLocaleString("es-VE")}</span>
                        )}
                      </p>
                    </div>
                    <p className="font-mono font-semibold tabular-nums">{formatUsd(Number(p.amount_usd))}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Total */}
          <section className="bg-secondary/40 px-6 py-5 print:bg-white">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Total</p>
              <div className="text-right">
                <p className="font-mono text-3xl font-semibold tabular-nums">
                  {formatUsd(totalUsd > 0 ? totalUsd : Number(appointment.price_usd))}
                </p>
                {appointment.price_vef_snapshot && (
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                    {formatVef(Number(appointment.price_vef_snapshot))}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Notes */}
          {appointment.notes && (
            <section className="border-t border-border px-6 py-4 text-xs text-muted-foreground">
              <p className="mb-1 font-medium uppercase tracking-wider">Notas</p>
              <p className="whitespace-pre-wrap">{appointment.notes}</p>
            </section>
          )}

          <footer className="border-t border-border px-6 py-4 text-center text-[11px] text-muted-foreground">
            Comprobante generado por <span className="font-medium text-foreground">Pulso</span>
          </footer>
        </article>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  mono,
  className,
}: {
  label: string
  value: string
  mono?: boolean
  className?: string
}) {
  return (
    <div className={className}>
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-sm ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  )
}
