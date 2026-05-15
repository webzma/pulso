"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

const LABELS: Record<string, string> = {
  dashboard: "Inicio",
  agenda: "Agenda",
  services: "Servicios",
  team: "Equipo",
  caja: "Caja",
  comisiones: "Comisiones",
}

export function DashboardBreadcrumb({ tenantName }: { tenantName: string }) {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)
  // First segment is "dashboard"
  const rest = segments.slice(1)

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem className="hidden sm:block">
          <BreadcrumbLink asChild>
            <Link href="/dashboard" className="text-muted-foreground">
              {tenantName}
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {rest.length === 0 ? (
          <>
            <BreadcrumbSeparator className="hidden sm:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>Inicio</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        ) : (
          rest.map((seg, i) => {
            const isLast = i === rest.length - 1
            const href = "/dashboard/" + rest.slice(0, i + 1).join("/")
            const label = LABELS[seg] ?? seg
            return (
              <span key={href} className="flex items-center gap-1.5">
                <BreadcrumbSeparator className="hidden sm:block" />
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage>{label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link href={href}>{label}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </span>
            )
          })
        )}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
