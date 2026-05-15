import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function KpiCard({
  label,
  value,
  icon,
  hint,
  accent,
  className,
}: {
  label: string
  value: string
  icon?: React.ReactNode
  hint?: React.ReactNode
  accent?: boolean
  className?: string
}) {
  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
          {icon && (
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-md",
                accent ? "bg-accent text-accent-foreground" : "bg-secondary text-foreground",
              )}
            >
              {icon}
            </span>
          )}
        </div>
        <p className="font-mono text-3xl font-semibold tabular-nums tracking-tight">{value}</p>
        {hint && <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  )
}
