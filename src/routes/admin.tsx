import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Loader2, LogOut, Baby } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dashboard } from "@/components/admin/Dashboard";
import { ReservationsTable } from "@/components/admin/ReservationsTable";
import { SizesManager } from "@/components/admin/SizesManager";
import { SettingsForm } from "@/components/admin/SettingsForm";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Painel da família — Chá de Fraldas" },
      { name: "description", content: "Acompanhe as reservas e organize o chá de fraldas." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Painel da família — Chá de Fraldas" },
      { property: "og:description", content: "Área administrativa do chá de fraldas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const qc = useQueryClient();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setIsAdmin(null); return; }
    supabase.rpc("claim_first_admin").then(({ data, error }) => setIsAdmin(!error && data === true));
  }, [session?.user.id]);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
  }

  if (session === undefined || (session && isAdmin === null))
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (!session) return <AuthForm />;

  if (!isAdmin)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-5 text-center">
        <h1 className="text-2xl font-semibold">Acesso restrito</h1>
        <p className="mt-2 max-w-sm text-muted-foreground">Sua conta ({session.user.email}) não tem permissão de administrador.</p>
        <Button className="mt-6 rounded-full" variant="outline" onClick={signOut}>Sair</Button>
      </div>
    );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link to="/" className="flex items-center gap-2 font-display text-xl font-semibold"><Baby className="h-5 w-5 text-primary" /> Painel do chá</Link>
          <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="h-4 w-4" /> Sair</Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8">
        <Tabs defaultValue="dashboard">
          <TabsList className="mb-6 flex h-auto flex-wrap justify-start gap-1 rounded-2xl">
            <TabsTrigger value="dashboard">Resumo</TabsTrigger>
            <TabsTrigger value="reservas">Reservas</TabsTrigger>
            <TabsTrigger value="fraldas">Fraldas</TabsTrigger>
            <TabsTrigger value="evento">Evento</TabsTrigger>
          </TabsList>
          <TabsContent value="dashboard"><Dashboard /></TabsContent>
          <TabsContent value="reservas"><ReservationsTable /></TabsContent>
          <TabsContent value="fraldas"><SizesManager /></TabsContent>
          <TabsContent value="evento"><SettingsForm /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function AuthForm() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [adminExists, setAdminExists] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.rpc("admin_exists").then(({ data }) => {
      setAdminExists(!!data);
      if (!data) setMode("up");
    });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error("E-mail ou senha incorretos.");
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/admin` } });
      if (error) toast.error(error.message);
      else if (!data.session) toast.success("Conta criada! Confirme pelo link enviado ao seu e-mail e depois entre.");
    }
    setBusy(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-hero px-5">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-3xl border bg-card p-7 shadow-soft">
        <h1 className="text-2xl font-semibold">{mode === "in" ? "Entrar no painel" : "Criar acesso da família"}</h1>
        {adminExists === false && (
          <p className="rounded-xl bg-butter p-3 text-sm text-butter-foreground">Ainda não há administrador. A primeira conta criada será a administradora.</p>
        )}
        <div className="space-y-2"><Label htmlFor="e">E-mail</Label><Input id="e" type="email" required className="h-12" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="pw">Senha</Label><Input id="pw" type="password" required minLength={8} className="h-12" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <Button type="submit" disabled={busy} className="h-12 w-full rounded-full font-bold">{busy ? <Loader2 className="animate-spin" /> : mode === "in" ? "Entrar" : "Criar conta"}</Button>
        <button type="button" className="w-full text-sm text-muted-foreground hover:underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "Primeiro acesso? Criar conta" : "Já tenho conta"}
        </button>
      </form>
    </div>
  );
}
