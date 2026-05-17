import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { AppSidebar } from "./app-sidebar"
import { DashboardBreadcrumb } from "./dashboard-breadcrumb"
import { RateBadge } from "./rate-badge"
import { ThemeToggle } from "@/components/theme-toggle"
import { fetchRateFromBCV } from "@/lib/exchange-rate"

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

  const [rate, { count: queuedNotifications }] = await Promise.all([
    fetchRateFromBCV(),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id)
      .eq("status", "queued"),
  ])

  return (
    <SidebarProvider>
      <AppSidebar
        tenant={{ name: tenant.name, slug: tenant.slug }}
        email={user.email ?? ""}
        queuedNotifications={queuedNotifications ?? 0}
      />
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border/60 bg-background/80 px-4 backdrop-blur-md">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <DashboardBreadcrumb tenantName={tenant.name} />
          <div className="ml-auto flex items-center gap-2">
            {rate && <RateBadge rateVef={rate.rate_vef} source={rate.source} />}
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
