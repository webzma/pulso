"use client"

import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

export function ViewToggle({ current, date }: { current: "day" | "week"; date: string }) {
  const router = useRouter()

  function go(view: "day" | "week") {
    if (view === current) return
    router.push(`/dashboard/agenda?view=${view}&date=${date}`)
  }

  return (
    <div className="inline-flex items-center rounded-md border border-border bg-card p-0.5 text-xs">
      <button
        type="button"
        onClick={() => go("day")}
        className={cn(
          "rounded-sm px-2.5 py-1 font-medium transition-colors",
          current === "day" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
        )}
      >
        Día
      </button>
      <button
        type="button"
        onClick={() => go("week")}
        className={cn(
          "rounded-sm px-2.5 py-1 font-medium transition-colors",
          current === "week" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
        )}
      >
        Semana
      </button>
    </div>
  )
}
