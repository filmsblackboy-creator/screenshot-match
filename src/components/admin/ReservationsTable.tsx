import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { friendlyError, sizesQuery, statusLabel, type Reservation } from "@/lib/event";
import { adminReservationsQuery } from "./Dashboard";

export function ReservationsTable() {
  const qc = useQueryClient();
  const { data: sizes = [] } = useQuery(sizesQuery);
  const { data: res = [], isLoading } = useQuery(adminReservationsQuery);
  const [q, setQ] = useState("");
  const [size, setSize] = useState("all");
  const [editing, setEditing] = useState<Reservation | null>(null);
  const sizeById = useMemo(() => Object.fromEntries(sizes.map((s) => [s.id, s])), [sizes]);

  const rows = res.filter(
    (r) =>
      (size === "all" || r.size_id === size) &&
      (!q || r.guest_name.toLowerCase().includes(q.toLowerCase()) || (r.phone ?? "").includes(q)),
  );

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin_reservations"] });
    qc.invalidateQueries({ queryKey: ["diaper_sizes"] });
  };

  async function update(id: string, patch: Partial<Reservation>) {
    const { error } = await supabase.from("reservations").update(patch).eq("id", id);
    if (error) return (toast.error(friendlyError(error)), false);
    toast.success("Reserva atualizada");
    refresh();
    return true;
  }

  async function clearDemo() {
    const { data, error } = await supabase.rpc("clear_demo_data");
    if (error) return toast.error(friendlyError(error));
    toast.success(`${data} reserva(s) de exemplo removida(s)`);
    refresh();
  }

  function exportCsv() {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const head = [
      "Nome",
      "Telefone",
      "Tamanho",
      "Quantidade",
      "Status",
      "Data",
      "Mensagem",
      "Código",
    ];
    const lines = rows.map((r) =>
      [
        r.guest_name,
        r.phone,
        sizeById[r.size_id]?.code,
        r.quantity,
        statusLabel[r.status],
        new Date(r.created_at).toLocaleString("pt-BR"),
        r.message,
        r.code,
      ]
        .map(esc)
        .join(";"),
    );
    const blob = new Blob(["\ufeff" + [head.map(esc).join(";"), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "reservas-cha-de-fraldas.csv";
    a.click();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-11 pl-9"
            placeholder="Buscar convidado ou telefone"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Select value={size} onValueChange={setSize}>
          <SelectTrigger className="h-11 md:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tamanhos</SelectItem>
            {sizes.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" className="h-11" onClick={exportCsv}>
          <Download className="h-4 w-4" /> Exportar CSV
        </Button>
        {res.some((r) => r.is_demo) && (
          <Button variant="ghost" className="h-11" onClick={clearDemo}>
            <Trash2 className="h-4 w-4" /> Limpar exemplos
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-3xl border bg-card shadow-soft">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Convidado</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Tamanho</TableHead>
              <TableHead className="text-right">Qtd</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Carregando…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Nenhuma reserva encontrada.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id} className={r.status === "cancelado" ? "opacity-50" : ""}>
                <TableCell className="font-semibold">
                  {r.guest_name}
                  {r.is_demo && (
                    <span className="ml-2 rounded bg-butter px-1.5 text-xs text-butter-foreground">
                      exemplo
                    </span>
                  )}
                  {r.message && (
                    <div
                      className="max-w-xs truncate text-xs font-normal text-muted-foreground"
                      title={r.message}
                    >
                      {r.message}
                    </div>
                  )}
                </TableCell>
                <TableCell>{r.phone ?? "—"}</TableCell>
                <TableCell>{sizeById[r.size_id]?.code}</TableCell>
                <TableCell className="text-right">{r.quantity}</TableCell>
                <TableCell className="whitespace-nowrap text-sm">
                  {new Date(r.created_at).toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell>
                  <Select
                    value={r.status}
                    onValueChange={(v) => update(r.id, { status: v as Reservation["status"] })}
                  >
                    <SelectTrigger className="h-9 w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reservado">Reservado</SelectItem>
                      <SelectItem value="entregue">Entregue</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(r)}>
                    Editar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <EditDialog
        r={editing}
        sizes={sizes}
        onClose={() => setEditing(null)}
        onSave={async (patch) => {
          if (editing && (await update(editing.id, patch))) setEditing(null);
        }}
      />
    </div>
  );
}

function EditDialog({
  r,
  sizes,
  onClose,
  onSave,
}: {
  r: Reservation | null;
  sizes: { id: string; code: string }[];
  onClose: () => void;
  onSave: (p: Partial<Reservation>) => void;
}) {
  const [form, setForm] = useState<Partial<Reservation>>({});
  const v = { ...r, ...form } as Reservation;
  return (
    <Dialog
      open={!!r}
      onOpenChange={(o) => {
        if (!o) {
          onClose();
          setForm({});
        }
      }}
    >
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle>Editar reserva</DialogTitle>
        </DialogHeader>
        {r && (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nome</Label>
              <Input
                value={v.guest_name}
                maxLength={120}
                onChange={(e) => setForm({ ...form, guest_name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Telefone</Label>
              <Input
                value={v.phone ?? ""}
                maxLength={30}
                onChange={(e) => setForm({ ...form, phone: e.target.value || null })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Tamanho</Label>
                <Select value={v.size_id} onValueChange={(x) => setForm({ ...form, size_id: x })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sizes.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  min={1}
                  max={999}
                  value={v.quantity}
                  onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                />
              </div>
            </div>
            <Button
              className="w-full rounded-full"
              onClick={() => {
                onSave(form);
                setForm({});
              }}
            >
              Salvar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
