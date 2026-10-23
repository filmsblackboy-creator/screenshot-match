import { queryOptions, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type EventSettings = Tables<"event_settings">;
export type DiaperSize = Tables<"diaper_sizes">;
export type Reservation = Tables<"reservations">;

export const settingsQuery = queryOptions({
  queryKey: ["event_settings"],
  queryFn: async () => {
    const { data, error } = await supabase.from("event_settings").select("*").eq("id", 1).maybeSingle();
    if (error) throw error;
    return data;
  },
});

export const sizesQuery = queryOptions({
  queryKey: ["diaper_sizes"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("diaper_sizes")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
});

export function available(size: Pick<DiaperSize, "goal" | "reserved">) {
  return Math.max(size.goal - size.reserved, 0);
}

/** Live-refresh public lists when stock or settings change. */
export function useLiveEventData() {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel(`live-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "diaper_sizes" }, () =>
        qc.invalidateQueries({ queryKey: ["diaper_sizes"] }),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "event_settings" }, () =>
        qc.invalidateQueries({ queryKey: ["event_settings"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}

export function friendlyError(err: unknown): string {
  const msg = (err as { message?: string })?.message ?? String(err);
  if (msg.includes("NOT_ENOUGH_AVAILABLE")) {
    const left = Number(msg.split("NOT_ENOUGH_AVAILABLE:")[1]?.trim() ?? "0");
    return left > 0
      ? `Ops! Agora restam apenas ${left} pacote(s) deste tamanho. Ajuste a quantidade e tente de novo.`
      : "Ops! Outro convidado acabou de reservar os últimos pacotes deste tamanho. Que tal escolher outro tamanho?";
  }
  if (msg.includes("INVALID_NAME")) return "Por favor, informe seu nome completo.";
  if (msg.includes("INVALID_QUANTITY")) return "Escolha uma quantidade válida.";
  if (msg.includes("INVALID_PHONE")) return "Telefone muito longo.";
  if (msg.includes("INVALID_MESSAGE")) return "Mensagem muito longa (máximo de 1000 caracteres).";
  if (msg.includes("DUPLICATE_REQUEST")) return "Essa reserva já foi registrada.";
  if (msg.includes("SIZE_NOT_FOUND")) return "Este tamanho não está mais disponível.";
  if (msg.includes("NOT_FOUND")) return "Reserva não encontrada.";
  if (msg.includes("NOT_EDITABLE")) return "Esta reserva não pode mais ser alterada.";
  return "Algo deu errado. Tente novamente em instantes.";
}

export const statusLabel: Record<string, string> = {
  reservado: "Reservado",
  entregue: "Entregue",
  cancelado: "Cancelado",
};
