import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { OnboardingForm } from "./onboarding-form"
import { Scissors } from "lucide-react"
import Link from "next/link"

export default async function OnboardingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  // ¿Ya tiene un tenant? Llevarlo al dashboard.
  const { data: existing } = await supabase
    .from("tenants")
    .select("id, slug")
    .eq("owner_user_id", user.id)
    .limit(1)
    .maybeSingle()

  if (existing) redirect("/dashboard")

  const defaultName = (user.user_metadata?.full_name as string | undefined) ?? ""

  return (
    <div className="min-h-svh bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Scissors className="h-4 w-4" />
            </span>
            <span className="text-base tracking-tight">Tijera</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
        <div className="mb-8">
          <p className="text-sm font-medium text-accent-foreground">
            <span className="text-accent">Paso 1</span> de 2 — Tu comercio
          </p>
          <h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Bienvenido, {defaultName.split(" ")[0] || "amigo"}
          </h1>
          <p className="mt-2 text-pretty text-muted-foreground">
            Cuéntanos de tu negocio. Esto creará tu URL pública de agendamiento, algo como{" "}
            <span className="font-mono text-foreground">tijera.app/tu-barberia</span>.
          </p>
        </div>

        <OnboardingForm />
      </main>
    </div>
  )
}
