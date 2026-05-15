/**
 * Validación de números telefónicos venezolanos.
 * Móviles: 0412, 0414, 0416, 0424, 0426.
 */
const VE_MOBILE_PREFIXES = ["0412", "0414", "0416", "0424", "0426"]

export function isValidVePhone(raw: string): boolean {
  const digits = raw.replace(/\D/g, "")
  if (digits.length !== 11) return false
  return VE_MOBILE_PREFIXES.some((p) => digits.startsWith(p))
}

export function formatVePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11)
  if (digits.length < 5) return digits
  return `${digits.slice(0, 4)}-${digits.slice(4, 7)}.${digits.slice(7)}`
}

/**
 * Convierte un número venezolano a formato internacional (+58XXXXXXXXXX) para wa.me.
 */
export function toWhatsappNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "")
  if (digits.startsWith("58") && digits.length === 12) return digits
  if (digits.startsWith("0") && digits.length === 11) return `58${digits.slice(1)}`
  return digits
}
