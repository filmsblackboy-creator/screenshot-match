import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { available, sizesQuery, useLiveEventData } from "@/lib/event";

export const adminReservationsQuery = {
  queryKey: ["admin_reservations"],
  queryFn: async () => {
    const { data, error } = await supabase.from("reservations").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
};

export function Dashboard() {
  useLiveEventData();
  const { data: sizes = [] } = useQuery(sizesQuery);
  const { data: res = [] } = useQuery(adminReservationsQuery);
  const active = sizes.filter((s) => s.active);
  const goal = active.reduce((a, s) => a + s.goal, 0);
  const reserved = active.reduce((a, s) => a + s.reserved, 0);
  const delivered = res.filter((r) => r.status === "entregue").reduce((a, r) => a + r.quantity, 0);
  const left = active.reduce((a, s) => a + available(s), 0);
  const people = new Set(res.filter((r) => r.status !== "cancelado").map((r) => r.guest_name.trim().toLowerCase())).size;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <Kpi label="Pacotes necessários" value={goal} />
        <Kpi label="Reservados" value={reserved} />
        <Kpi label="Já entregues" value={delivered} />
        <Kpi label="Disponíveis" value={left} />
        <Kpi label="Pessoas" value={people} />
      </div>
      <div className="rounded-3xl border bg-card p-6 shadow-soft">
        <h2 className="text-xl font-semibold">Progresso por tamanho</h2>
        <div className="mt-5 space-y-4">
          {active.map((s) => {
            const pct = s.goal ? Math.min(100, Math.round((s.reserved / s.goal) * 100)) : 0;
            return (
              <div key={s.id}>
                <div className="flex justify-between text-sm"><span className="font-bold">{s.code} · {s.label}</span><span className="text-muted-foreground">{s.reserved}/{s.goal} ({pct}%)</span></div>
                <div className="mt-1 h-3 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} /></div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border bg-card p-5 shadow-soft">
      <div className="font-display text-3xl font-semibold">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}
