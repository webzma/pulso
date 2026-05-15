import Link from "next/link"
import { Mail, Scissors } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function SignUpSuccessPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-background p-6">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link href="/" className="mx-auto flex items-center gap-2 font-semibold">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Scissors className="h-4 w-4" />
          </span>
          <span className="text-lg tracking-tight">Tijera</span>
        </Link>
        <Card>
          <CardHeader>
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-accent/15">
              <Mail className="h-5 w-5 text-accent-foreground" />
            </div>
            <CardTitle className="text-2xl">Revisa tu correo</CardTitle>
            <CardDescription>Te enviamos un enlace para confirmar tu cuenta</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Confirma tu correo para activar tu cuenta. Después podrás crear tu comercio y empezar a recibir citas.
            </p>
            <Button asChild variant="outline" className="w-full bg-transparent">
              <Link href="/auth/login">Volver a entrar</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
