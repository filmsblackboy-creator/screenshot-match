create extension if not exists pgcrypto with schema extensions;

-- Roles
create type public.app_role as enum ('admin');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "own roles readable" on public.user_roles for select to authenticated using (user_id = auth.uid());

-- First signed-in user becomes admin when no admin exists yet
create or replace function public.claim_first_admin()
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return false; end if;
  perform pg_advisory_xact_lock(424242);
  if exists (select 1 from public.user_roles where role = 'admin') then
    return public.has_role(auth.uid(), 'admin');
  end if;
  insert into public.user_roles(user_id, role) values (auth.uid(), 'admin');
  return true;
end $$;
revoke execute on function public.claim_first_admin() from public, anon;
grant execute on function public.claim_first_admin() to authenticated;

create or replace function public.admin_exists()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where role = 'admin')
$$;
grant execute on function public.admin_exists() to anon, authenticated;

-- Event settings (single row)
create table public.event_settings (
  id int primary key default 1 check (id = 1),
  baby_name text not null default 'Nosso bebê',
  headline text not null default 'Nosso bebê está chegando!',
  welcome_message text not null default 'Você faz parte desse momento tão especial. Escolha um pacotinho de amor para nos ajudar a preparar a chegada do nosso bebê!',
  event_at timestamptz,
  location text,
  location_url text,
  family_info text,
  thank_you_message text not null default 'Presente reservado com carinho! 💛 Obrigado por fazer parte desse momento tão especial!',
  primary_color text,
  cover_image_url text,
  updated_at timestamptz not null default now()
);
grant select on public.event_settings to anon, authenticated;
grant update, insert on public.event_settings to authenticated;
grant all on public.event_settings to service_role;
alter table public.event_settings enable row level security;
create policy "settings public read" on public.event_settings for select to anon, authenticated using (true);
create policy "settings admin update" on public.event_settings for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "settings admin insert" on public.event_settings for insert to authenticated with check (public.has_role(auth.uid(),'admin'));

-- Diaper sizes
create table public.diaper_sizes (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  label text not null,
  description text,
  brands text,
  goal int not null default 10 check (goal >= 0),
  reserved int not null default 0,
  image_url text,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.diaper_sizes to anon, authenticated;
grant insert, update, delete on public.diaper_sizes to authenticated;
grant all on public.diaper_sizes to service_role;
alter table public.diaper_sizes enable row level security;
create policy "sizes public read" on public.diaper_sizes for select to anon, authenticated using (active or public.has_role(auth.uid(),'admin'));
create policy "sizes admin insert" on public.diaper_sizes for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "sizes admin update" on public.diaper_sizes for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "sizes admin delete" on public.diaper_sizes for delete to authenticated using (public.has_role(auth.uid(),'admin'));

-- Reservations (private)
create type public.reservation_status as enum ('reservado','entregue','cancelado');
create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  size_id uuid not null references public.diaper_sizes(id) on delete restrict,
  guest_name text not null check (char_length(guest_name) between 2 and 120),
  phone text check (phone is null or char_length(phone) <= 30),
  quantity int not null check (quantity > 0 and quantity <= 999),
  message text check (message is null or char_length(message) <= 1000),
  status public.reservation_status not null default 'reservado',
  code text not null unique,
  token_hash text not null unique,
  request_id uuid unique,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.reservations(size_id);
grant select, update, delete on public.reservations to authenticated;
grant all on public.reservations to service_role;
alter table public.reservations enable row level security;
create policy "res admin select" on public.reservations for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "res admin update" on public.reservations for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "res admin delete" on public.reservations for delete to authenticated using (public.has_role(auth.uid(),'admin'));

-- Capacity guard: runs for every insert/update from any path
create or replace function public.reservations_capacity_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_goal int; v_used int;
begin
  new.updated_at := now();
  if new.status = 'cancelado' then return new; end if;
  select goal into v_goal from public.diaper_sizes where id = new.size_id for update;
  if v_goal is null then raise exception 'SIZE_NOT_FOUND'; end if;
  select coalesce(sum(quantity),0) into v_used from public.reservations
   where size_id = new.size_id and status <> 'cancelado' and id <> new.id;
  if v_used + new.quantity > v_goal then
    raise exception 'NOT_ENOUGH_AVAILABLE:%', greatest(v_goal - v_used, 0);
  end if;
  return new;
end $$;
create trigger reservations_capacity before insert or update on public.reservations
for each row execute function public.reservations_capacity_guard();

create or replace function public.recompute_size_reserved(_size uuid)
returns void language sql security definer set search_path = public as $$
  update public.diaper_sizes s set reserved = coalesce((select sum(quantity) from public.reservations r where r.size_id = s.id and r.status <> 'cancelado'),0)
  where s.id = _size;
$$;
revoke execute on function public.recompute_size_reserved(uuid) from public, anon, authenticated;

create or replace function public.reservations_after_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op in ('INSERT','UPDATE') then perform public.recompute_size_reserved(new.size_id); end if;
  if tg_op in ('DELETE','UPDATE') and (tg_op = 'DELETE' or old.size_id <> new.size_id) then perform public.recompute_size_reserved(old.size_id); end if;
  return null;
end $$;
create trigger reservations_after after insert or update or delete on public.reservations
for each row execute function public.reservations_after_change();

-- Prevent tampering with reserved column by admins directly
create or replace function public.sizes_protect_reserved()
returns trigger language plpgsql as $$
begin
  if current_user in ('authenticated','anon') then new.reserved := old.reserved; end if;
  return new;
end $$;
create trigger sizes_protect before update on public.diaper_sizes for each row execute function public.sizes_protect_reserved();

-- Guest RPCs
create or replace function public.create_reservation(_size_id uuid, _name text, _phone text, _quantity int, _message text, _request_id uuid)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare v_token text; v_code text; v_active boolean; v_label text; v_code_size text;
begin
  _name := btrim(coalesce(_name,''));
  if char_length(_name) < 2 or char_length(_name) > 120 then raise exception 'INVALID_NAME'; end if;
  if _quantity is null or _quantity < 1 or _quantity > 999 then raise exception 'INVALID_QUANTITY'; end if;
  _phone := nullif(btrim(coalesce(_phone,'')),''); _message := nullif(btrim(coalesce(_message,'')),'');
  if _phone is not null and char_length(_phone) > 30 then raise exception 'INVALID_PHONE'; end if;
  if _message is not null and char_length(_message) > 1000 then raise exception 'INVALID_MESSAGE'; end if;
  if _request_id is not null and exists (select 1 from public.reservations where request_id = _request_id) then
    raise exception 'DUPLICATE_REQUEST';
  end if;
  select active, label, code into v_active, v_label, v_code_size from public.diaper_sizes where id = _size_id;
  if v_active is not true then raise exception 'SIZE_NOT_FOUND'; end if;
  v_token := encode(gen_random_bytes(32), 'hex');
  v_code := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
  insert into public.reservations(size_id, guest_name, phone, quantity, message, code, token_hash, request_id)
  values (_size_id, _name, _phone, _quantity, _message, v_code, encode(digest(v_token, 'sha256'), 'hex'), _request_id);
  return json_build_object('token', v_token, 'code', v_code, 'size_code', v_code_size, 'size_label', v_label, 'quantity', _quantity);
end $$;

create or replace function public.get_reservation_by_token(_token text)
returns json language sql stable security definer set search_path = public, extensions as $$
  select json_build_object('code', r.code, 'guest_name', r.guest_name, 'phone', r.phone, 'quantity', r.quantity,
    'message', r.message, 'status', r.status, 'created_at', r.created_at, 'size_id', s.id, 'size_code', s.code,
    'size_label', s.label, 'available', greatest(s.goal - s.reserved, 0))
  from public.reservations r join public.diaper_sizes s on s.id = r.size_id
  where r.token_hash = encode(digest(_token, 'sha256'), 'hex')
$$;

create or replace function public.update_reservation_by_token(_token text, _name text, _phone text, _quantity int, _message text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid; v_status reservation_status;
begin
  select id, status into v_id, v_status from public.reservations where token_hash = encode(digest(_token, 'sha256'), 'hex');
  if v_id is null then raise exception 'NOT_FOUND'; end if;
  if v_status <> 'reservado' then raise exception 'NOT_EDITABLE'; end if;
  _name := btrim(coalesce(_name,''));
  if char_length(_name) < 2 or char_length(_name) > 120 then raise exception 'INVALID_NAME'; end if;
  if _quantity is null or _quantity < 1 or _quantity > 999 then raise exception 'INVALID_QUANTITY'; end if;
  update public.reservations set guest_name = _name, phone = nullif(btrim(coalesce(_phone,'')),''),
    quantity = _quantity, message = nullif(btrim(coalesce(_message,'')),'') where id = v_id;
  return public.get_reservation_by_token(_token);
end $$;

create or replace function public.cancel_reservation_by_token(_token text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid; v_status reservation_status;
begin
  select id, status into v_id, v_status from public.reservations where token_hash = encode(digest(_token, 'sha256'), 'hex');
  if v_id is null then raise exception 'NOT_FOUND'; end if;
  if v_status <> 'reservado' then raise exception 'NOT_EDITABLE'; end if;
  update public.reservations set status = 'cancelado' where id = v_id;
  return public.get_reservation_by_token(_token);
end $$;

grant execute on function public.create_reservation(uuid,text,text,int,text,uuid) to anon, authenticated;
grant execute on function public.get_reservation_by_token(text) to anon, authenticated;
grant execute on function public.update_reservation_by_token(text,text,text,int,text) to anon, authenticated;
grant execute on function public.cancel_reservation_by_token(text) to anon, authenticated;

create or replace function public.clear_demo_data()
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'FORBIDDEN'; end if;
  delete from public.reservations where is_demo; get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.clear_demo_data() from public, anon;
grant execute on function public.clear_demo_data() to authenticated;

alter publication supabase_realtime add table public.diaper_sizes;
alter publication supabase_realtime add table public.event_settings;

-- Seed
insert into public.event_settings(id, baby_name, event_at, location, family_info)
values (1, 'Theo', now() + interval '30 days', 'Salão de festas do Condomínio Jardim das Flores — Rua das Acácias, 120', 'Com amor, Ana & Pedro');

insert into public.diaper_sizes(code, label, description, brands, goal, sort_order) values
 ('RN','Recém-nascido','Até 4,5 kg','Pampers, Huggies', 10, 1),
 ('P','Pequeno','3 a 6 kg','Pampers, Huggies, MamyPoko', 25, 2),
 ('M','Médio','5 a 9 kg','Qualquer marca', 30, 3),
 ('G','Grande','8 a 12 kg','Qualquer marca', 30, 4),
 ('XG','Extragrande','11 a 15 kg','Qualquer marca', 20, 5),
 ('XXG','Extra extragrande','Acima de 14 kg','Qualquer marca', 10, 6);

insert into public.reservations(size_id, guest_name, phone, quantity, message, code, token_hash, is_demo, status)
select id, 'Convidada Exemplo', null, 4, 'Reserva de demonstração', 'DEMO' || code, encode(extensions.digest('demo-'||code, 'sha256'),'hex'), true,
  case when code = 'M' then 'entregue'::reservation_status else 'reservado'::reservation_status end
from public.diaper_sizes where code in ('P','M','G');