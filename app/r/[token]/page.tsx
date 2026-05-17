import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ReceiptView } from "./receipt-view"

export const dynamic = "force-dynamic"

type ReceiptPayload = {
  appointment: {
    id: string
    scheduled_at: string
    duration_minutes: number
    client_name: string
    client_phone: string
    status: string
    price_usd: number | string
    price_vef_snapshot: number | string | null
    rate_vef_snapshot: number | string | null
    created_at: string
    notes: string | null
  }
  service: { name: string; category: string | null; duration_minutes: number }
  staff: { display_name: string } | null
  tenant: {
    name: string
    slug: string
    phone: string | null
    address: string | null
    logo_url: string | null
    business_type: string | null
  }
  payments: Array<{
    method: string
    amount_original: number | string
    currency: "USD" | "VEF"
    amount_usd: number | string
    rate_vef_used: number | string | null
    created_at: string
  }>
}

export default async function ReceiptPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("get_receipt_by_token", { p_token: token })
  if (error || !data) notFound()
  return <ReceiptView data={data as ReceiptPayload} />
}
