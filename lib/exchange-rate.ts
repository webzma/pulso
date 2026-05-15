/**
 * Servicio de tasa de cambio USD → VEF
 *
 * Fuente primaria: pyDolarVe (https://pydolarve.org/) — API pública gratuita.
 * Fuente fallback: ExchangeRate-API (vía exchangerate.host).
 *
 * Estrategia:
 *  - getLatestRate(source): obtiene la tasa más reciente persistida en DB
 *  - fetchRateFromBCV(): pega a pyDolarVe y devuelve el valor BCV oficial
 *  - refreshDailyRates(): pensado para correr 1 vez al día via cron / route
 */

export type RateSource = "bcv" | "paralelo" | "custom"

export interface FetchedRate {
  source: RateSource
  rate_vef: number
  fetched_at: string
}

const PYDOLAR_URL = "https://pydolarve.org/api/v1/dollar?page=bcv"
const PYDOLAR_PARALELO_URL = "https://pydolarve.org/api/v1/dollar?page=enparalelovzla"

export async function fetchRateFromBCV(): Promise<FetchedRate | null> {
  try {
    const res = await fetch(PYDOLAR_URL, {
      next: { revalidate: 3600 },
      headers: { Accept: "application/json" },
    })
    if (!res.ok) return null
    const data = (await res.json()) as {
      monitors?: { usd?: { price?: number; last_update?: string } }
    }
    const price = data?.monitors?.usd?.price
    if (typeof price !== "number" || price <= 0) return null
    return {
      source: "bcv",
      rate_vef: price,
      fetched_at: data?.monitors?.usd?.last_update ?? new Date().toISOString(),
    }
  } catch (err) {
    console.log("[v0] fetchRateFromBCV error:", err instanceof Error ? err.message : err)
    return null
  }
}

export async function fetchRateFromParalelo(): Promise<FetchedRate | null> {
  try {
    const res = await fetch(PYDOLAR_PARALELO_URL, {
      next: { revalidate: 3600 },
      headers: { Accept: "application/json" },
    })
    if (!res.ok) return null
    const data = (await res.json()) as {
      monitors?: { enparalelovzla?: { price?: number; last_update?: string } }
    }
    const price = data?.monitors?.enparalelovzla?.price
    if (typeof price !== "number" || price <= 0) return null
    return {
      source: "paralelo",
      rate_vef: price,
      fetched_at: data?.monitors?.enparalelovzla?.last_update ?? new Date().toISOString(),
    }
  } catch (err) {
    console.log("[v0] fetchRateFromParalelo error:", err instanceof Error ? err.message : err)
    return null
  }
}

/**
 * Convierte USD a VEF usando una tasa dada.
 * Redondea a 2 decimales (céntimos de bolívar).
 */
export function usdToVef(amountUsd: number, rateVef: number): number {
  return Math.round(amountUsd * rateVef * 100) / 100
}

/**
 * Convierte VEF a USD.
 */
export function vefToUsd(amountVef: number, rateVef: number): number {
  if (rateVef <= 0) return 0
  return Math.round((amountVef / rateVef) * 100) / 100
}

/**
 * Formatea un monto en USD para mostrar (e.g. $25.00).
 */
export function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount)
}

/**
 * Formatea un monto en VEF para mostrar (e.g. Bs. 925,50).
 */
export function formatVef(amount: number): string {
  return `Bs. ${new Intl.NumberFormat("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`
}
