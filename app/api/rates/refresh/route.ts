import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { fetchRateFromBCV, fetchRateFromParalelo } from "@/lib/exchange-rate"

/**
 * Endpoint para refrescar las tasas oficiales (BCV + paralelo).
 *
 * Pensado para correr 1x al día (Vercel Cron o llamada manual).
 * Guarda 1 fila por fuente/día en `currency_rates` (tenant_id = null).
 *
 * Seguridad: protegido por CRON_SECRET via header `Authorization: Bearer <secret>`.
 * Si CRON_SECRET no está configurado, permite la llamada (modo dev).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get("authorization")
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }
  }

  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10)

  const [bcv, paralelo] = await Promise.all([fetchRateFromBCV(), fetchRateFromParalelo()])

  const inserted: Array<{ source: string; rate_vef: number }> = []

  for (const r of [bcv, paralelo]) {
    if (!r) continue
    // Idempotencia diaria: si ya existe una fila global para hoy/source, la actualizamos.
    const { data: existing } = await supabase
      .from("currency_rates")
      .select("id")
      .is("tenant_id", null)
      .eq("source", r.source)
      .eq("effective_date", today)
      .maybeSingle()

    if (existing) {
      await supabase.from("currency_rates").update({ rate_vef: r.rate_vef }).eq("id", existing.id)
    } else {
      await supabase
        .from("currency_rates")
        .insert({ tenant_id: null, source: r.source, rate_vef: r.rate_vef, effective_date: today })
    }
    inserted.push({ source: r.source, rate_vef: r.rate_vef })
  }

  return NextResponse.json({ ok: true, date: today, rates: inserted })
}
