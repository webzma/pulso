"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  CalendarClock,
  Dumbbell,
  Users,
  Wallet,
  Percent,
  ExternalLink,
  ChevronsUpDown,
  LogOut,
  Settings,
  Sparkles,
  Contact,
  BadgeCheck,
  CalendarRange,
  Bell,
  Clock,
  BarChart3,
  History,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  exact?: boolean
  badgeKind?: "queued"
}

const PRIMARY: readonly NavItem[] = [
  { href: "/dashboard", label: "Inicio", icon: Home, exact: true },
  { href: "/dashboard/agenda", label: "Agenda", icon: CalendarClock },
  { href: "/dashboard/notificaciones", label: "Notificaciones", icon: Bell, badgeKind: "queued" },
  { href: "/dashboard/caja", label: "Caja", icon: Wallet },
  { href: "/dashboard/comisiones", label: "Comisiones", icon: Percent },
  { href: "/dashboard/reportes", label: "Reportes", icon: BarChart3 },
]

const PEOPLE = [
  { href: "/dashboard/clientes", label: "Clientes", icon: Contact },
  { href: "/dashboard/membresias", label: "Membresías", icon: BadgeCheck },
  { href: "/dashboard/team", label: "Equipo", icon: Users },
] as const

const SETUP = [
  { href: "/dashboard/services", label: "Servicios", icon: Sparkles },
  { href: "/dashboard/planes", label: "Planes", icon: CalendarRange },
  { href: "/dashboard/horarios", label: "Horarios", icon: Clock },
  { href: "/dashboard/auditoria", label: "Auditoría", icon: History },
] as const

export function AppSidebar({
  tenant,
  email,
  queuedNotifications,
}: {
  tenant: { name: string; slug: string }
  email: string
  queuedNotifications: number
}) {
  const pathname = usePathname()
  const router = useRouter()

  function isActive(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname === href || pathname.startsWith(href + "/")
  }

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace("/auth/login")
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <span className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Dumbbell className="size-4" />
                </span>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate text-sm font-semibold tracking-tight">{tenant.name}</span>
                  <span className="truncate text-xs text-muted-foreground">pulso.app/{tenant.slug}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Operación</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {PRIMARY.map((item) => {
                const showBadge = item.badgeKind === "queued" && queuedNotifications > 0
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive(item.href, item.exact)} tooltip={item.label}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                        {showBadge && (
                          <Badge className="ml-auto h-5 min-w-5 justify-center px-1 font-mono text-[10px]">
                            {queuedNotifications}
                          </Badge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Personas</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {PEOPLE.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={isActive(item.href)} tooltip={item.label}>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Configuración</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {SETUP.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={isActive(item.href)} tooltip={item.label}>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="URL pública">
                  <Link href={`/${tenant.slug}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink />
                    <span>URL pública</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <span className="flex aspect-square size-8 items-center justify-center rounded-lg bg-secondary text-foreground text-xs font-semibold">
                    {(email[0] ?? "U").toUpperCase()}
                  </span>
                  <div className="grid flex-1 text-left leading-tight">
                    <span className="truncate text-sm font-medium">Mi cuenta</span>
                    <span className="truncate text-xs text-muted-foreground">{email}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="grid leading-tight">
                    <span className="font-medium">{tenant.name}</span>
                    <span className="text-xs text-muted-foreground">{email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>
                  <Settings className="mr-2 size-4" />
                  Ajustes (próximamente)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 size-4" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
