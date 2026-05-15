import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Dumbbell } from "lucide-react"
import { LogoutButton } from "./logout-button"
import { DashboardNav } from "./dashboard-nav"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, name, slug, business_type")
    .eq("owner_user_id", user.id)
    .limit(1)
    .maybeSingle()

  if (!tenant) redirect("/onboarding")

  return (
    <div className="min-h-svh bg-background pb-20 lg:pb-0">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Dumbbell className="h-4 w-4" />
            </span>
            <span className="text-base tracking-tight">{tenant.name}</span>
          </Link>
          <LogoutButton />
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl">
        <aside className="hidden w-56 shrink-0 border-r border-border/60 px-3 py-6 lg:block">
          <DashboardNav />
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 sm:py-8 lg:px-8">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur lg:hidden">
        <DashboardNav variant="bottom" />
      </nav>
    </div>
  )
}
