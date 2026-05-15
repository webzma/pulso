import Link from "next/link"
import {
  Dumbbell,
  CalendarClock,
  Wallet,
  TrendingUp,
  WifiOff,
  Smartphone,
  ArrowRight,
  CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { fetchRateFromBCV } from "@/lib/exchange-rate"

export default async function LandingPage() {
  const rate = await fetchRateFromBCV()

  return (
    <main className="min-h-svh bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Dumbbell className="h-4 w-4" />
            </span>
            <span className="text-base tracking-tight">Pulso</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href="/auth/login">Entrar</Link>
            </Button>
            <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Link href="/auth/sign-up">
                Empezar gratis
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 pt-12 pb-16 sm:pt-20 sm:pb-24">
          <div className="flex flex-col items-center gap-6 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-medium text-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Hecho en Venezuela, para tu gimnasio
            </span>
            <h1 className="max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
              Gestiona tu gimnasio desde el teléfono.{" "}
              <span className="text-accent">Cobra en dólares</span>, cierra en bolívares.
            </h1>
            <p className="max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              Mensualidades, reservas de clases y comisiones de entrenadores en una sola app.
              Cierre de caja bimonetario, pensado para conexiones lentas y dueños que viven en el piso del gym.
            </p>

            <div className="flex flex-col items-center gap-3 pt-2 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-12 w-full bg-primary px-6 text-primary-foreground hover:bg-primary/90 sm:w-auto"
              >
                <Link href="/auth/sign-up">
                  Crear mi cuenta
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 w-full border-border bg-transparent px-6 sm:w-auto"
              >
                <Link href="#features">Cómo funciona</Link>
              </Button>
            </div>

            {rate && (
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4 text-accent" />
                <span>
                  Tasa BCV de hoy:{" "}
                  <strong className="font-mono text-foreground">
                    Bs. {rate.rate_vef.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </strong>{" "}
                  / USD
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border/60 bg-card/30">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Todo lo que tu gimnasio necesita
            </h2>
            <p className="mt-3 text-pretty text-muted-foreground">
              Sin instalaciones, sin licencias caras. Tu gimnasio en marcha en menos de 5 minutos.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<CalendarClock className="h-5 w-5" />}
              title="Mensualidades y clases"
              desc="Vende pases diarios, mensualidades y reservas de clases. Tu cliente reserva sin crear cuenta, solo con su teléfono."
            />
            <FeatureCard
              icon={<Wallet className="h-5 w-5" />}
              title="Bimonetario nativo"
              desc="Precios en USD, conversión automática a Bs. con tasa BCV o tu tasa personalizada."
            />
            <FeatureCard
              icon={<TrendingUp className="h-5 w-5" />}
              title="Comisiones al instante"
              desc="Cada sesión de entrenamiento o clase genera la comisión exacta del entrenador. Pagas con un toque."
            />
            <FeatureCard
              icon={<Smartphone className="h-5 w-5" />}
              title="Mobile-first real"
              desc="Diseñada para usarse en el piso del gym. Sin menús enredados, sin scroll infinito."
            />
            <FeatureCard
              icon={<WifiOff className="h-5 w-5" />}
              title="Funciona con poca señal"
              desc="Cache offline: si pierdes la señal un momento, sigues viendo la agenda del día."
            />
            <FeatureCard
              icon={<CheckCircle2 className="h-5 w-5" />}
              title="Cierre de caja sin Excel"
              desc="Contrasta lo físico vs. lo que dice el sistema: Efectivo $, Bs., Pago Móvil, Zelle, Binance."
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Empezar es así de simple
            </h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <Step
              n="1"
              title="Crea tu cuenta"
              desc="Solo email y contraseña. Te damos una URL pública del estilo pulso.app/tu-gimnasio."
            />
            <Step
              n="2"
              title="Carga tus planes y clases"
              desc="Mensualidad, pase diario, sesión de entrenamiento personal, clase de spinning. Precios en USD."
            />
            <Step
              n="3"
              title="Comparte y agenda"
              desc="Manda tu link por estado de WhatsApp. Tus clientes reservan solos y tú confirmas con un toque."
            />
          </div>
          <div className="mt-12 flex justify-center">
            <Button
              asChild
              size="lg"
              className="h-12 bg-primary px-6 text-primary-foreground hover:bg-primary/90"
            >
              <Link href="/auth/sign-up">
                Empezar ahora
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 bg-card/30">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground">
              <Dumbbell className="h-3 w-3" />
            </span>
            <span className="font-medium text-foreground">Pulso</span>
            <span>© {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth/login" className="hover:text-foreground">
              Entrar
            </Link>
            <Link href="/auth/sign-up" className="hover:text-foreground">
              Registrarse
            </Link>
          </div>
        </div>
      </footer>
    </main>
  )
}

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode
  title: string
  desc: string
}) {
  return (
    <div className="group rounded-xl border border-border bg-card p-5 transition-colors hover:border-accent/50">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15 text-accent-foreground">
        <span className="text-accent">{icon}</span>
      </div>
      <h3 className="mt-4 text-base font-semibold tracking-tight">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{desc}</p>
    </div>
  )
}

function Step({ n, title, desc }: { n: string; title: string; desc: string }) {
  return (
    <div className="flex gap-4 rounded-xl border border-border bg-card p-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary font-mono text-base font-semibold text-primary-foreground">
        {n}
      </div>
      <div>
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{desc}</p>
      </div>
    </div>
  )
}
