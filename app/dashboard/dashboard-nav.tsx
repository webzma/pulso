"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, CalendarClock, Scissors, Users, Wallet, Percent } from "lucide-react"
import { cn } from "@/lib/utils"

const links = [
  { href: "/dashboard", label: "Inicio", icon: Home },
  { href: "/dashboard/agenda", label: "Agenda", icon: CalendarClock },
  { href: "/dashboard/services", label: "Servicios", icon: Scissors },
  { href: "/dashboard/team", label: "Equipo", icon: Users },
  { href: "/dashboard/caja", label: "Caja", icon: Wallet },
  { href: "/dashboard/comisiones", label: "Comisiones", icon: Percent },
] as const

export function DashboardNav({ variant = "side" }: { variant?: "side" | "bottom" }) {
  const pathname = usePathname()

  if (variant === "bottom") {
    return (
      <ul className="flex items-stretch justify-around">
        {links.map(({ href, label, icon: Icon }) => {
          const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href)
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] transition-colors",
                  active ? "text-accent" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="leading-none">{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <ul className="flex flex-col gap-1">
      {links.map(({ href, label, icon: Icon }) => {
        const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href)
        return (
          <li key={href}>
            <Link
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-accent/15 font-medium text-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <Icon className={cn("h-4 w-4", active && "text-accent")} />
              {label}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
