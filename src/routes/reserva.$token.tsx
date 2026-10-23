import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Minus, Plus, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { friendlyError, statusLabel } from "@/lib/event";

export const Route = createFileRoute("/reserva/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Minha reserva — Chá de Fraldas" },
      { name: "description", content: "Consulte, altere ou cancele sua reserva de fraldas." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Minha reserva — Chá de Fraldas" },
      { property: "og:description", content: "Consulte, altere ou cancele sua reserva." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReservationPage,
});

type R = {
  code: string;
  guest_name: string;
  phone: string | null;
  quantity: number;
  message: string | null;
  status: string;
  created_at: string;
  size_code: string;
  size_label: string;
  available: number;
};

function ReservationPage() {
  const { token } = Route.useParams();
  const [r, setR] = useState<R | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);

  const apply = (d: R | null) => {
    setR(d);
    if (d) {
      setName(d.guest_name);
      setPhone(d.phone ?? "");
      setMessage(d.message ?? "");
      setQty(d.quantity);
    }
  };

  useEffect(() => {
    supabase.rpc("get_reservation_by_token", { _token: token }).then(({ data, error }) => {
      if (error) {
        toast.error(friendlyError(error));
        apply(null);
        return;
      }
      apply((data as unknown as R) ?? null);
    });
  }, [token]);

  if (r === undefined)
    return (
      <Center>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </Center>
    );
  if (r === null)
    return (
      <Center>
        <h1 className="text-2xl font-semibold">Reserva não encontrada</h1>
        <p className="mt-2 text-muted-foreground">Verifique se o link está completo.</p>
        <Button asChild className="mt-6 rounded-full">
          <Link to="/">Voltar à lista</Link>
        </Button>
      </Center>
    );

  const max = r.quantity + r.available;
  const editable = r.status === "reservado";

  async function save() {
    setBusy(true);
    const { data, error } = await supabase.rpc("update_reservation_by_token", {
      _token: token,
      _name: name,
      _phone: phone,
      _quantity: qty,
      _message: message,
    });
    setBusy(false);
    if (error) return toast.error(friendlyError(error));
    apply(data as unknown as R);
    toast.success("Reserva atualizada com carinho!");
  }
  async function cancel() {
    setBusy(true);
    const { data, error } = await supabase.rpc("cancel_reservation_by_token", { _token: token });
    setBusy(false);
    if (error) return toast.error(friendlyError(error));
    apply(data as unknown as R);
    toast.success("Reserva cancelada.");
  }

  return (
    <div className="min-h-screen bg-hero px-5 py-10">
      <div className="mx-auto max-w-lg">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar à lista
        </Link>
        <div className="mt-4 rounded-3xl border bg-card p-6 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-semibold">Minha reserva</h1>
              <p className="text-sm text-muted-foreground">
                Código <span className="font-mono font-bold">{r.code}</span>
              </p>
            </div>
            <span className="rounded-full bg-secondary px-3 py-1 text-sm font-bold text-secondary-foreground">
              {statusLabel[r.status]}
            </span>
          </div>
          <div className="mt-5 rounded-2xl bg-muted p-4">
            <p className="text-lg font-bold">
              Tamanho {r.size_code} · {r.quantity} pacote(s)
            </p>
            <p className="text-sm text-muted-foreground">{r.size_label}</p>
          </div>

          {editable ? (
            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="n">Nome completo</Label>
                <Input
                  id="n"
                  className="h-12"
                  value={name}
                  maxLength={120}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p">Telefone / WhatsApp</Label>
                <Input
                  id="p"
                  className="h-12"
                  value={phone}
                  maxLength={30}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Quantidade</Label>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-12 w-12 rounded-full"
                    disabled={qty <= 1}
                    onClick={() => setQty(qty - 1)}
                    aria-label="Diminuir"
                  >
                    <Minus />
                  </Button>
                  <span className="w-12 text-center text-2xl font-bold">{qty}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-12 w-12 rounded-full"
                    disabled={qty >= max}
                    onClick={() => setQty(qty + 1)}
                    aria-label="Aumentar"
                  >
                    <Plus />
                  </Button>
                  <span className="text-sm text-muted-foreground">máx. {max}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="m">Mensagem</Label>
                <Textarea
                  id="m"
                  value={message}
                  maxLength={1000}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
              <Button
                className="h-12 w-full rounded-full text-base font-bold"
                disabled={busy}
                onClick={save}
              >
                {busy ? <Loader2 className="animate-spin" /> : "Salvar alterações"}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-12 w-full rounded-full text-destructive"
                    disabled={busy}
                  >
                    Cancelar reserva
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancelar esta reserva?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Os pacotes voltarão a ficar disponíveis para outros convidados.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Manter</AlertDialogCancel>
                    <AlertDialogAction onClick={cancel}>Sim, cancelar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ) : (
            <p className="mt-6 text-muted-foreground">
              {r.status === "entregue"
                ? "Seu presente já foi entregue. Muito obrigado! 💛"
                : "Esta reserva foi cancelada."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-5 text-center">
      {children}
    </div>
  );
}
