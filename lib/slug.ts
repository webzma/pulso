/**
 * Genera un slug URL-friendly a partir de un texto libre.
 * Ej: "Iron Gym Caracas" → "iron-gym-caracas"
 */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
}

/**
 * Valida si un slug es aceptable.
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{1,58}[a-z0-9])?$/.test(slug)
}
