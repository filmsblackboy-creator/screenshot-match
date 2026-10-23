import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { settingsQuery, type EventSettings } from "@/lib/event";

function toLocal(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function SettingsForm() {
  const qc = useQueryClient();
  const { data } = useQuery(settingsQuery);
  const [f, setF] = useState<Partial<EventSettings>>({});
  const [when, setWhen] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data) { setF(data); setWhen(toLocal(data.event_at)); }
  }, [data]);

  const set = (k: keyof EventSettings) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  async function save() {
    setBusy(true);
    const { error } = await supabase.from("event_settings").upsert({
      id: 1,
      baby_name: (f.baby_name ?? "").slice(0, 80),
      headline: (f.headline ?? "").slice(0, 120),
      welcome_message: (f.welcome_message ?? "").slice(0, 1000),
      thank_you_message: (f.thank_you_message ?? "").slice(0, 300),
      event_at: when ? new Date(when).toISOString() : null,
      location: f.location || null,
      location_url: f.location_url || null,
      family_info: f.family_info || null,
      cover_image_url: f.cover_image_url || null,
      primary_color: f.primary_color || null,
      updated_at: new Date().toISOString(),
    });
    setBusy(false);
    if (error) return toast.error("Não foi possível salvar.");
    toast.success("Configurações salvas");
    qc.invalidateQueries({ queryKey: ["event_settings"] });
  }

  return (
    <div className="grid gap-4 rounded-3xl border bg-card p-6 shadow-soft md:grid-cols-2">
      <F label="Nome do bebê"><Input value={f.baby_name ?? ""} onChange={set("baby_name")} /></F>
      <F label="Frase principal"><Input value={f.headline ?? ""} onChange={set("headline")} /></F>
      <F label="Mensagem de boas-vindas" wide><Textarea rows={3} value={f.welcome_message ?? ""} onChange={set("welcome_message")} /></F>
      <F label="Data e horário"><Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} /></F>
      <F label="Local"><Input value={f.location ?? ""} onChange={set("location")} /></F>
      <F label="Link do mapa (opcional)"><Input value={f.location_url ?? ""} placeholder="https://maps.google.com/…" onChange={set("location_url")} /></F>
      <F label="Informações da família"><Input value={f.family_info ?? ""} onChange={set("family_info")} /></F>
      <F label="Mensagem de agradecimento" wide><Input value={f.thank_you_message ?? ""} onChange={set("thank_you_message")} /></F>
      <F label="Imagem de capa (URL)"><Input value={f.cover_image_url ?? ""} placeholder="https://…" onChange={set("cover_image_url")} /></F>
      <F label="Cor principal">
        <div className="flex gap-2">
          <input type="color" aria-label="Escolher cor" className="h-10 w-14 cursor-pointer rounded-md border bg-transparent" value={f.primary_color?.startsWith("#") ? f.primary_color : "#7a9e83"} onChange={set("primary_color")} />
          <Input value={f.primary_color ?? ""} placeholder="Padrão (verde-sálvia)" onChange={set("primary_color")} />
        </div>
      </F>
      <div className="md:col-span-2"><Button disabled={busy} onClick={save} className="h-12 rounded-full px-8 font-bold">Salvar configurações</Button></div>
    </div>
  );
}

function F({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return <div className={`space-y-1 ${wide ? "md:col-span-2" : ""}`}><Label>{label}</Label>{children}</div>;
}
