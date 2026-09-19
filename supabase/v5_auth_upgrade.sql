-- B REDDY SALES V5 AUTH UPGRADE
-- Run once in Supabase SQL Editor after V4.
-- It keeps your existing business data and adds Admin/Receiver login + user-name audit trail.

create table if not exists user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text,
  role text not null default 'receiver' check (role in ('admin','receiver')),
  receiver_id bigint references receivers(id),
  status boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table user_profiles enable row level security;
alter table audit_logs add column if not exists user_id uuid references auth.users(id);
alter table audit_logs add column if not exists user_name text;
alter table audit_logs add column if not exists user_role text;

create or replace function current_user_role()
returns text language sql stable security definer set search_path=public as $$
  select role from user_profiles where id=auth.uid() and status=true limit 1;
$$;

create or replace function is_admin()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from user_profiles where id=auth.uid() and role='admin' and status=true);
$$;

create or replace function is_receiver()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from user_profiles where id=auth.uid() and role='receiver' and status=true);
$$;

grant execute on function current_user_role() to authenticated;
grant execute on function is_admin() to authenticated;
grant execute on function is_receiver() to authenticated;

-- Remove old anonymous access and make all application data authenticated-only.
do $$
declare t text;
begin
  foreach t in array array['customers','item_master','receivers','suppliers','sales','sale_items','collections','collection_allocations','purchases','purchase_items','stock_transactions','expense_types','expenses','audit_logs','user_profiles']
  loop
    execute format('drop policy if exists "public_select_%s" on %I',t,t);
    execute format('drop policy if exists "public_insert_%s" on %I',t,t);
    execute format('drop policy if exists "public_update_%s" on %I',t,t);
    execute format('drop policy if exists "public_delete_%s" on %I',t,t);
  end loop;
end $$;

-- Make this upgrade safely repeatable.
do $$
declare p text; t text;
begin
  foreach t in array array['customers','item_master','receivers','suppliers','sales','sale_items','collections','collection_allocations','purchases','purchase_items','stock_transactions','expense_types','expenses','audit_logs','user_profiles']
  loop
    foreach p in array array[
      'auth_select_data','auth_select_items','auth_select_receivers','auth_select_suppliers','auth_select_sales','auth_select_sale_items',
      'auth_select_collections','auth_select_collection_allocations','auth_select_purchases','auth_select_purchase_items',
      'auth_select_stock_transactions','auth_select_expense_types','auth_select_expenses','auth_select_user_profiles','auth_select_audit_logs',
      'receiver_insert_collections','receiver_update_collections','receiver_insert_allocations','receiver_update_allocations',
      'receiver_update_sales','receiver_update_receivers'
    ]
    loop
      execute format('drop policy if exists %I on %I',p,t);
    end loop;
    execute format('drop policy if exists "admin_insert_%s" on %I',t,t);
    execute format('drop policy if exists "admin_update_%s" on %I',t,t);
    execute format('drop policy if exists "admin_delete_%s" on %I',t,t);
  end loop;
end $$;

create policy "auth_select_data" on customers for select to authenticated using (is_admin() or is_receiver());
create policy "auth_select_items" on item_master for select to authenticated using (is_admin() or is_receiver());
create policy "auth_select_receivers" on receivers for select to authenticated using (is_admin() or is_receiver());
create policy "auth_select_suppliers" on suppliers for select to authenticated using (is_admin() or is_receiver());
create policy "auth_select_sales" on sales for select to authenticated using (is_admin() or is_receiver());
create policy "auth_select_sale_items" on sale_items for select to authenticated using (is_admin() or is_receiver());
create policy "auth_select_collections" on collections for select to authenticated using (is_admin() or is_receiver());
create policy "auth_select_collection_allocations" on collection_allocations for select to authenticated using (is_admin() or is_receiver());
create policy "auth_select_purchases" on purchases for select to authenticated using (is_admin() or is_receiver());
create policy "auth_select_purchase_items" on purchase_items for select to authenticated using (is_admin() or is_receiver());
create policy "auth_select_stock_transactions" on stock_transactions for select to authenticated using (is_admin() or is_receiver());
create policy "auth_select_expense_types" on expense_types for select to authenticated using (is_admin() or is_receiver());
create policy "auth_select_expenses" on expenses for select to authenticated using (is_admin() or is_receiver());
create policy "auth_select_user_profiles" on user_profiles for select to authenticated using (id=auth.uid() or is_admin());
create policy "auth_select_audit_logs" on audit_logs for select to authenticated using (is_admin());

do $$
declare t text;
begin
  foreach t in array array['customers','item_master','receivers','suppliers','sales','sale_items','collections','collection_allocations','purchases','purchase_items','stock_transactions','expense_types','expenses','audit_logs','user_profiles']
  loop
    execute format('create policy "admin_insert_%s" on %I for insert to authenticated with check (is_admin())',t,t);
    execute format('create policy "admin_update_%s" on %I for update to authenticated using (is_admin()) with check (is_admin())',t,t);
    execute format('create policy "admin_delete_%s" on %I for delete to authenticated using (is_admin())',t,t);
  end loop;
end $$;

create policy "receiver_insert_collections" on collections for insert to authenticated
  with check (is_receiver() and receiver_id=(select receiver_id from user_profiles where id=auth.uid()));
create policy "receiver_update_collections" on collections for update to authenticated
  using (is_receiver() and receiver_id=(select receiver_id from user_profiles where id=auth.uid()))
  with check (is_receiver() and receiver_id=(select receiver_id from user_profiles where id=auth.uid()));
create policy "receiver_insert_allocations" on collection_allocations for insert to authenticated with check (is_receiver());
create policy "receiver_update_allocations" on collection_allocations for update to authenticated using (is_receiver()) with check (is_receiver());
create policy "receiver_update_sales" on sales for update to authenticated using (is_receiver()) with check (is_receiver());
create policy "receiver_update_receivers" on receivers for update to authenticated
  using (is_receiver() and id=(select receiver_id from user_profiles where id=auth.uid()))
  with check (is_receiver() and id=(select receiver_id from user_profiles where id=auth.uid()));

create or replace function b_reddy_audit_trigger()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare rid bigint; payload jsonb; uname text; urole text;
begin
  if TG_OP='DELETE' then rid:=(to_jsonb(OLD)->>'id')::bigint; payload:=to_jsonb(OLD);
  elsif TG_OP='UPDATE' then rid:=(to_jsonb(NEW)->>'id')::bigint; payload:=jsonb_build_object('old',to_jsonb(OLD),'new',to_jsonb(NEW));
  else rid:=(to_jsonb(NEW)->>'id')::bigint; payload:=to_jsonb(NEW);
  end if;
  select full_name,role into uname,urole from user_profiles where id=auth.uid();
  insert into audit_logs(table_name,record_id,action,details,user_id,user_name,user_role)
  values(TG_TABLE_NAME,rid,TG_OP,payload,auth.uid(),coalesce(uname,'System'),coalesce(urole,'system'));
  return coalesce(NEW,OLD);
end;
$$;

-- Refresh triggers so all major transactions capture the logged-in user.
drop trigger if exists audit_customers on customers;
create trigger audit_customers after insert or update or delete on customers for each row execute function b_reddy_audit_trigger();
drop trigger if exists audit_sales on sales;
create trigger audit_sales after insert or update or delete on sales for each row execute function b_reddy_audit_trigger();
drop trigger if exists audit_collections on collections;
create trigger audit_collections after insert or update or delete on collections for each row execute function b_reddy_audit_trigger();
drop trigger if exists audit_purchases on purchases;
create trigger audit_purchases after insert or update or delete on purchases for each row execute function b_reddy_audit_trigger();
drop trigger if exists audit_expenses on expenses;
create trigger audit_expenses after insert or update or delete on expenses for each row execute function b_reddy_audit_trigger();
drop trigger if exists audit_receivers on receivers;
create trigger audit_receivers after insert or update or delete on receivers for each row execute function b_reddy_audit_trigger();
drop trigger if exists audit_items on item_master;
create trigger audit_items after insert or update or delete on item_master for each row execute function b_reddy_audit_trigger();

do $$
begin
  begin alter publication supabase_realtime add table user_profiles; exception when duplicate_object then null; end;
end $$;
