import Link from "next/link"
import { Dumbbell } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
        <Dumbbell className="h-7 w-7" />
      </div>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">Ese gimnasio no existe</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        La URL que abriste no corresponde a ningún negocio activo en Pulso. Verifica el link que te compartieron.
      </p>
      <Button asChild className="mt-6" variant="outline">
        <Link href="/">Ir a la página principal</Link>
      </Button>
    </div>
  )
}
