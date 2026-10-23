import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Minus, Plus, Heart, Copy, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { available, friendlyError, type DiaperSize } from "@/lib/event";

const schema = z.object({
  name: z.string().trim().min(2, "Por favor, informe seu nome completo.").max(120, "Nome muito longo."),
  phone: z.string().trim().max(30, "Telefone muito longo.").optional(),
  message: z.string().trim().max(1000, "Mensagem muito longa.").optional(),
});

type Result = { token: string; code: string; size_code: string; size_label: string; quantity: number };

export function ReserveDialog({
  size,
  open,
  onOpenChange,
  thankYou,
}: {
  size: DiaperSize | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  thankYou: string;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [qty, setQty] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [soldOut, setSoldOut] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const requestId = useRef<string>("");
  const left = size ? available(size) : 0;

  useEffect(() => {
    if (open) {
      setError(null);
      setSoldOut(false);
      setResult(null);
      setQty(1);
      requestId.current = crypto.randomUUID();
    }
  }, [open, size?.id]);

  useEffect(() => {
    if (!result && qty > left && left > 0) setQty(left);
  }, [left, qty, result]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!size || submitting) return;
    const parsed = schema.safeParse({ name, phone, message });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Verifique os dados.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const { data, error: err } = await supabase.rpc("create_reservation", {
      _size_id: size.id,
      _name: parsed.data.name,
      _phone: parsed.data.phone ?? "",
      _quantity: qty,
      _message: parsed.data.message ?? "",
      _request_id: requestId.current,
    });
    setSubmitting(false);
    qc.invalidateQueries({ queryKey: ["diaper_sizes"] });
    if (err) {
      setError(friendlyError(err));
      if (err.message.includes("NOT_ENOUGH_AVAILABLE:0") || err.message.includes("SIZE_NOT_FOUND")) setSoldOut(true);
      requestId.current = crypto.randomUUID();
      return;
    }
    setResult(data as unknown as Result);
  }

  const link = result ? `${typeof window !== "undefined" ? window.location.origin : ""}/reserva/${result.token}` : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-3xl sm:max-w-md">
        {!size ? null : result ? (
          <div className="py-2 text-center animate-rise">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-butter text-butter-foreground">
              <Heart className="h-8 w-8" fill="currentColor" />
            </div>
            <h2 className="mt-4 text-2xl font-semibold">{thankYou}</h2>
            <div className="mt-5 rounded-2xl bg-secondary p-4 text-left text-secondary-foreground">
              <p className="text-sm">Resumo da sua reserva</p>
              <p className="mt-1 text-lg font-bold">
                {result.quantity} pacote(s) · Tamanho {result.size_code}
              </p>
              <p className="text-sm">{result.size_label}</p>
              <p className="mt-3 text-sm">
                Código: <span className="font-mono font-bold tracking-wider">{result.code}</span>
              </p>
            </div>
            <div className="mt-4 rounded-2xl border bg-card p-4 text-left">
              <p className="text-sm font-semibold">Seu link privado</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Guarde este link para consultar, alterar ou cancelar sua reserva. Ele não será exibido novamente.
              </p>
              <div className="mt-3 flex gap-2">
                <Input readOnly value={link} className="text-xs" onFocus={(e) => e.currentTarget.select()} />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Copiar link"
                  onClick={() => {
                    navigator.clipboard.writeText(link);
                    toast.success("Link copiado!");
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Button asChild variant="link" className="mt-1 h-auto px-0">
                <Link to="/reserva/$token" params={{ token: result.token }}>
                  Abrir minha reserva
                </Link>
              </Button>
            </div>
            <Button className="mt-5 h-12 w-full rounded-full text-base" onClick={() => onOpenChange(false)}>
              <Check className="h-5 w-5" /> Concluir
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">
                Fralda tamanho {size.code}
              </DialogTitle>
              <DialogDescription>
                {size.label}
                {size.brands ? ` · Marcas: ${size.brands}` : ""} · {left} disponível(is)
              </DialogDescription>
            </DialogHeader>

            {soldOut ? (
              <div className="rounded-2xl bg-butter p-4 text-butter-foreground">
                <p className="font-semibold">{error}</p>
                <Button type="button" variant="outline" className="mt-3 rounded-full" onClick={() => onOpenChange(false)}>
                  Escolher outro tamanho
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-base">Seu nome completo *</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required className="h-12 text-base" autoComplete="name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-base">Telefone / WhatsApp (opcional)</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} inputMode="tel" className="h-12 text-base" autoComplete="tel" />
                </div>
                <div className="space-y-2">
                  <Label className="text-base">Quantidade de pacotes</Label>
                  <div className="flex items-center gap-3">
                    <Button type="button" variant="outline" size="icon" className="h-12 w-12 rounded-full" disabled={qty <= 1} onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Diminuir">
                      <Minus className="h-5 w-5" />
                    </Button>
                    <span className="w-12 text-center text-2xl font-bold" aria-live="polite">{qty}</span>
                    <Button type="button" variant="outline" size="icon" className="h-12 w-12 rounded-full" disabled={qty >= left} onClick={() => setQty((q) => Math.min(left, q + 1))} aria-label="Aumentar">
                      <Plus className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="msg" className="text-base">Mensagem para a família (opcional)</Label>
                  <Textarea id="msg" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} rows={3} />
                </div>
                {error && <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive" role="alert">{error}</p>}
                <Button type="submit" disabled={submitting || left < 1} className="h-14 w-full rounded-full text-base font-bold">
                  {submitting ? <><Loader2 className="h-5 w-5 animate-spin" /> Reservando…</> : "Confirmar minha reserva"}
                </Button>
              </>
            )}
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
