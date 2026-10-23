import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState, type CSSProperties } from "react";
import { CalendarHeart, Clock, MapPin, Share2, Link2, Gift, Sparkles, Baby } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ReserveDialog } from "@/components/ReserveDialog";
import { available, settingsQuery, sizesQuery, useLiveEventData, type DiaperSize } from "@/lib/event";
import heroImg from "@/assets/hero.jpg";
import packImg from "@/assets/diaper-pack.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Chá de Fraldas — Escolha seu pacotinho de amor" },
      { name: "description", content: "Nosso bebê está chegando! Reserve fraldas para o nosso chá em poucos cliques." },
      { property: "og:title", content: "Chá de Fraldas — Nosso bebê está chegando!" },
      { property: "og:description", content: "Escolha um pacotinho de amor e ajude a preparar a chegada do nosso bebê." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(settingsQuery),
      context.queryClient.ensureQueryData(sizesQuery),
    ]),
  component: Index,
});

function useCountdown(target: string | null | undefined) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!target || now === null) return null;
  const diff = Math.max(new Date(target).getTime() - now, 0);
  return {
    dias: Math.floor(diff / 86400000),
    horas: Math.floor((diff / 3600000) % 24),
    min: Math.floor((diff / 60000) % 60),
    seg: Math.floor((diff / 1000) % 60),
    done: diff === 0,
  };
}

function Index() {
  const { data: settings } = useSuspenseQuery(settingsQuery);
  const { data: sizes } = useSuspenseQuery(sizesQuery);
  useLiveEventData();
  const [selected, setSelected] = useState<DiaperSize | null>(null);
  const cd = useCountdown(settings?.event_at);
  const visible = sizes.filter((s) => s.active);
  const current = selected ? visible.find((s) => s.id === selected.id) ?? selected : null;

  const eventDate = settings?.event_at ? new Date(settings.event_at) : null;
  const style = settings?.primary_color ? ({ "--primary": settings.primary_color, "--ring": settings.primary_color } as CSSProperties) : undefined;

  const share = () => {
    const url = window.location.origin;
    const text = `${settings?.headline ?? "Chá de fraldas"} Escolha seu pacotinho de amor: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  };
  const copy = () => {
    navigator.clipboard.writeText(window.location.origin);
    toast.success("Link do chá copiado!");
  };

  return (
    <div style={style} className="min-h-screen">
      {/* Hero */}
      <header className="relative overflow-hidden bg-hero">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-5 pb-14 pt-10 md:grid-cols-2 md:pt-16">
          <div className="animate-rise text-center md:text-left">
            <span className="inline-flex items-center gap-2 rounded-full bg-butter px-4 py-1.5 text-sm font-bold text-butter-foreground">
              <Baby className="h-4 w-4" /> Chá de fraldas {settings?.baby_name ? `do ${settings.baby_name}` : ""}
            </span>
            <h1 className="mt-5 text-4xl font-semibold leading-tight md:text-6xl">
              {settings?.headline ?? "Nosso bebê está chegando!"}
            </h1>
            <p className="mx-auto mt-5 max-w-lg text-lg text-muted-foreground md:mx-0">{settings?.welcome_message}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center md:justify-start">
              <Button asChild size="lg" className="h-14 rounded-full px-8 text-base font-bold shadow-lift">
                <a href="#fraldas"><Gift className="h-5 w-5" /> Escolher minhas fraldas</a>
              </Button>
              <Button size="lg" variant="outline" className="h-14 rounded-full px-6 text-base" onClick={share}>
                <Share2 className="h-5 w-5" /> Compartilhar
              </Button>
            </div>
          </div>
          <div className="relative">
            <img
              src={settings?.cover_image_url || heroImg}
              alt="Ilustração delicada com fraldas e ursinho"
              width={1280}
              height={960}
              className="mx-auto w-full max-w-lg rounded-[2.5rem] object-cover shadow-lift animate-float-soft"
            />
          </div>
        </div>
      </header>

      {/* Event info + countdown */}
      <section className="mx-auto -mt-6 max-w-6xl px-5">
        <div className="grid gap-4 rounded-3xl border bg-card p-6 shadow-soft md:grid-cols-[1fr_auto] md:items-center">
          <div className="grid gap-3 sm:grid-cols-3">
            <Info icon={<CalendarHeart className="h-5 w-5" />} label="Data" value={eventDate ? eventDate.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }) : "A definir"} />
            <Info icon={<Clock className="h-5 w-5" />} label="Horário" value={eventDate ? eventDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "A definir"} />
            <Info
              icon={<MapPin className="h-5 w-5" />}
              label="Local"
              value={
                settings?.location_url ? (
                  <a href={settings.location_url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{settings.location}</a>
                ) : (settings?.location ?? "A definir")
              }
            />
          </div>
          {cd && !cd.done && (
            <div className="flex justify-center gap-2" aria-label="Contagem regressiva">
              {([["dias", cd.dias], ["horas", cd.horas], ["min", cd.min], ["seg", cd.seg]] as const).map(([l, v]) => (
                <div key={l} className="w-16 rounded-2xl bg-secondary py-2 text-center text-secondary-foreground">
                  <div className="font-display text-2xl font-semibold tabular-nums">{String(v).padStart(2, "0")}</div>
                  <div className="text-xs uppercase tracking-wide">{l}</div>
                </div>
              ))}
            </div>
          )}
          {cd?.done && <p className="text-center font-display text-xl">É hoje! 🎉</p>}
        </div>
      </section>

      {/* List */}
      <main id="fraldas" className="mx-auto max-w-6xl scroll-mt-6 px-5 py-16">
        <div className="text-center">
          <h2 className="text-3xl font-semibold md:text-4xl">Lista de fraldas</h2>
          <p className="mt-3 text-muted-foreground">1. Escolha o tamanho · 2. Informe nome e quantidade · 3. Confirme</p>
        </div>
        {visible.length === 0 ? (
          <p className="mt-10 text-center text-muted-foreground">A lista ainda está sendo preparada.</p>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((s, i) => (
              <SizeCard key={s.id} size={s} index={i} onPick={() => setSelected(s)} />
            ))}
          </div>
        )}
      </main>

      <footer className="border-t bg-muted/50">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-5 py-10 text-center">
          {settings?.family_info && <p className="font-display text-xl">{settings.family_info}</p>}
          <div className="flex flex-wrap justify-center gap-3">
            <Button variant="outline" className="rounded-full" onClick={share}><Share2 className="h-4 w-4" /> Enviar pelo WhatsApp</Button>
            <Button variant="outline" className="rounded-full" onClick={copy}><Link2 className="h-4 w-4" /> Copiar link</Button>
          </div>
          <Link to="/admin" className="text-xs text-muted-foreground hover:underline">Área da família</Link>
        </div>
      </footer>

      <ReserveDialog
        size={current}
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
        thankYou={settings?.thank_you_message ?? "Presente reservado com carinho! 💛"}
      />
    </div>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">{icon}</span>
      <div>
        <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="font-semibold capitalize-first">{value}</div>
      </div>
    </div>
  );
}

function SizeCard({ size, index, onPick }: { size: DiaperSize; index: number; onPick: () => void }) {
  const left = available(size);
  const pct = size.goal > 0 ? Math.min(100, Math.round((size.reserved / size.goal) * 100)) : 100;
  const done = left === 0;
  return (
    <article
      className="group flex flex-col overflow-hidden rounded-3xl border bg-card shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift animate-rise"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="relative bg-muted">
        <img src={size.image_url || packImg} alt={`Pacote de fraldas tamanho ${size.code}`} loading="lazy" width={816} height={816} className="aspect-[4/3] w-full object-cover" />
        <span className="absolute left-4 top-4 rounded-2xl bg-card px-4 py-2 font-display text-3xl font-bold shadow-soft">{size.code}</span>
        {done && (
          <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-butter px-3 py-1 text-sm font-bold text-butter-foreground">
            <Sparkles className="h-4 w-4" /> Meta atingida
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-xl font-semibold">Fralda tamanho {size.code}</h3>
        <p className="text-sm text-muted-foreground">
          {size.label}{size.description ? ` · ${size.description}` : ""}
        </p>
        {size.brands && <p className="mt-1 text-sm text-muted-foreground">Marcas: {size.brands}</p>}
        <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
          <Stat label="Meta" value={size.goal} />
          <Stat label="Reservados" value={size.reserved} />
          <Stat label="Disponíveis" value={left} highlight />
        </dl>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1 text-right text-xs text-muted-foreground">{pct}% da meta</p>
        <Button onClick={onPick} disabled={done} className="mt-5 h-12 w-full rounded-full text-base font-bold">
          {done ? "Meta atingida 💛" : "Quero levar"}
        </Button>
      </div>
    </article>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl py-2 ${highlight ? "bg-secondary text-secondary-foreground" : "bg-muted"}`}>
      <dd className="font-display text-2xl font-semibold">{value}</dd>
      <dt className="text-xs">{label}</dt>
    </div>
  );
}
