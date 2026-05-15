import { TrendingUp } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function RateBadge({ rateVef, source }: { rateVef: number; source: string }) {
  const formatted = rateVef.toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs">
            <span className="flex size-1.5 rounded-full bg-accent" aria-hidden />
            <span className="text-muted-foreground uppercase tracking-wider text-[10px]">{source}</span>
            <span className="font-mono font-semibold text-foreground">Bs. {formatted}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end">
          <div className="flex items-center gap-1 text-xs">
            <TrendingUp className="size-3" />
            Tasa de hoy por USD
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
