import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { sizesQuery, type DiaperSize } from "@/lib/event";

export function SizesManager() {
  const qc = useQueryClient();
  const { data: sizes = [] } = useQuery(sizesQuery);
  const refresh = () => qc.invalidateQueries({ queryKey: ["diaper_sizes"] });

  async function add() {
    const max = sizes.reduce((a, s) => Math.max(a, s.sort_order), 0);
    const { error } = await supabase.from("diaper_sizes").insert({ code: "NOVO", label: "Nova categoria", goal: 10, sort_order: max + 1 });
    if (error) return toast.error("Não foi possível adicionar.");
    refresh();
  }

  async function move(i: number, dir: -1 | 1) {
    const a = sizes[i], b = sizes[i + dir];
    if (!a || !b) return;
    await supabase.from("diaper_sizes").update({ sort_order: b.sort_order }).eq("id", a.id);
    await supabase.from("diaper_sizes").update({ sort_order: a.sort_order === b.sort_order ? a.sort_order + dir : a.sort_order }).eq("id", b.id);
    refresh();
  }

  return (
    <div className="space-y-4">
      {sizes.map((s, i) => (
        <SizeRow key={s.id} size={s} onSaved={refresh} onUp={i > 0 ? () => move(i, -1) : undefined} onDown={i < sizes.length - 1 ? () => move(i, 1) : undefined} />
      ))}
      <Button variant="outline" className="rounded-full" onClick={add}><Plus className="h-4 w-4" /> Adicionar tamanho/categoria</Button>
    </div>
  );
}

function SizeRow({ size, onSaved, onUp, onDown }: { size: DiaperSize; onSaved: () => void; onUp?: () => void; onDown?: () => void }) {
  const [f, setF] = useState(size);
  const dirty = JSON.stringify(f) !== JSON.stringify(size);

  async function save() {
    if (f.goal < size.reserved) return toast.error(`A meta não pode ser menor que o já reservado (${size.reserved}).`);
    const { error } = await supabase.from("diaper_sizes").update({
      code: f.code.trim().slice(0, 12), label: f.label.trim().slice(0, 80), description: f.description, brands: f.brands,
      goal: f.goal, image_url: f.image_url || null, active: f.active,
    }).eq("id", size.id);
    if (error) return toast.error("Não foi possível salvar.");
    toast.success("Salvo");
    onSaved();
  }
  async function remove() {
    if (!confirm(`Remover o tamanho ${size.code}?`)) return;
    const { error } = await supabase.from("diaper_sizes").delete().eq("id", size.id);
    if (error) return toast.error("Este tamanho já tem reservas. Desative-o em vez de remover.");
    onSaved();
  }

  return (
    <div className="rounded-3xl border bg-card p-5 shadow-soft">
      <div className="grid gap-3 md:grid-cols-6">
        <Field label="Sigla"><Input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} /></Field>
        <Field label="Nome" className="md:col-span-2"><Input value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} /></Field>
        <Field label="Descrição" className="md:col-span-2"><Input value={f.description ?? ""} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <Field label={`Meta (${size.reserved} reservados)`}><Input type="number" min={0} value={f.goal} onChange={(e) => setF({ ...f, goal: Number(e.target.value) })} /></Field>
        <Field label="Marcas desejadas" className="md:col-span-3"><Input value={f.brands ?? ""} onChange={(e) => setF({ ...f, brands: e.target.value })} /></Field>
        <Field label="URL da imagem" className="md:col-span-3"><Input value={f.image_url ?? ""} placeholder="https://…" onChange={(e) => setF({ ...f, image_url: e.target.value })} /></Field>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm"><Switch checked={f.active} onCheckedChange={(v) => setF({ ...f, active: v })} /> Visível na lista</label>
        <div className="ml-auto flex gap-1">
          <Button size="icon" variant="ghost" disabled={!onUp} onClick={onUp} aria-label="Subir"><ArrowUp className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" disabled={!onDown} onClick={onDown} aria-label="Descer"><ArrowDown className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" onClick={remove} aria-label="Remover"><Trash2 className="h-4 w-4 text-destructive" /></Button>
          <Button disabled={!dirty} onClick={save} className="rounded-full">Salvar</Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return <div className={`space-y-1 ${className ?? ""}`}><Label className="text-xs">{label}</Label>{children}</div>;
}
