"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowRight, Globe, Loader2 } from "lucide-react"
import { isValidSlug, slugify } from "@/lib/slug"
import { isValidVePhone } from "@/lib/phone"

export function OnboardingForm() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [slugTouched, setSlugTouched] = useState(false)
  const [businessType, setBusinessType] = useState<"gimnasio" | "crossfit" | "estudio" | "otro">("gimnasio")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [slugCheck, setSlugCheck] = useState<"idle" | "checking" | "available" | "taken">("idle")

  // Auto-fill slug from name unless user manually edited it.
  useEffect(() => {
    if (!slugTouched) setSlug(slugify(name))
  }, [name, slugTouched])

  // Debounced uniqueness check on slug.
  useEffect(() => {
    if (!slug || !isValidSlug(slug)) {
      setSlugCheck("idle")
      return
    }
    setSlugCheck("checking")
    const t = setTimeout(async () => {
      const { data, error: qErr } = await supabase.from("tenants").select("id").eq("slug", slug).maybeSingle()
      if (qErr) {
        setSlugCheck("idle")
        return
      }
      setSlugCheck(data ? "taken" : "available")
    }, 350)
    return () => clearTimeout(t)
  }, [slug, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) return setError("El nombre del comercio es obligatorio")
    if (!isValidSlug(slug)) return setError("La URL solo puede contener letras, números y guiones")
    if (slugCheck === "taken") return setError("Esa URL ya está en uso, prueba otra")
    if (phone && !isValidVePhone(phone))
      return setError("Teléfono inválido. Usa formato 0412/0414/0416/0424/0426")

    setIsLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/login")
        return
      }

      // Insert tenant
      const { data: tenant, error: tErr } = await supabase
        .from("tenants")
        .insert({
          name: name.trim(),
          slug,
          business_type: businessType,
          phone: phone || null,
          address: address || null,
          owner_user_id: user.id,
        })
        .select("id")
        .single()

      if (tErr || !tenant) throw tErr ?? new Error("No se pudo crear el comercio")

      // Insert owner as member
      const { error: mErr } = await supabase.from("tenant_members").insert({
        tenant_id: tenant.id,
        user_id: user.id,
        display_name: (user.user_metadata?.full_name as string | undefined) ?? "Dueño",
        role: "owner",
        commission_percentage: 0,
        active: true,
      })
      if (mErr) throw mErr

      router.push("/dashboard")
      router.refresh()
    } catch (err: unknown) {
      console.log("[v0] onboarding error:", err)
      setError(err instanceof Error ? err.message : "No se pudo crear el comercio")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardContent className="p-5 sm:p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="grid gap-2">
            <Label htmlFor="name">Nombre del comercio</Label>
            <Input
              id="name"
              required
              placeholder="Iron Gym Caracas"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="slug">URL pública</Label>
            <div className="flex items-stretch overflow-hidden rounded-md border border-input bg-card focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0">
              <span className="flex items-center gap-1.5 border-r border-input bg-muted px-3 text-sm text-muted-foreground">
                <Globe className="h-3.5 w-3.5" />
                pulso.app/
              </span>
              <input
                id="slug"
                className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true)
                  setSlug(slugify(e.target.value))
                }}
                placeholder="tu-gimnasio"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {slug && slugCheck === "checking" && (
                <span className="inline-flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Verificando disponibilidad…
                </span>
              )}
              {slug && slugCheck === "available" && <span className="text-accent-foreground">URL disponible</span>}
              {slug && slugCheck === "taken" && <span className="text-destructive">Esa URL ya está en uso</span>}
              {!slug && "Esta será la dirección que compartes con tus clientes."}
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="businessType">Tipo de negocio</Label>
            <Select value={businessType} onValueChange={(v) => setBusinessType(v as typeof businessType)}>
              <SelectTrigger id="businessType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gimnasio">Gimnasio</SelectItem>
                <SelectItem value="crossfit">Box de CrossFit / funcional</SelectItem>
                <SelectItem value="estudio">Estudio (yoga, pilates, spinning)</SelectItem>
                <SelectItem value="otro">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="phone">Teléfono (opcional)</Label>
              <Input
                id="phone"
                type="tel"
                inputMode="numeric"
                placeholder="0414-123.4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">Dirección (opcional)</Label>
              <Input
                id="address"
                placeholder="Av. Principal, Caracas"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="h-11 bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={isLoading || slugCheck === "taken"}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                Creando comercio…
              </>
            ) : (
              <>
                Crear comercio
                <ArrowRight className="ml-1 h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
