-- B REDDY SALES V6 - Merge B Reddy Cash + B Reddy PhonePe into ONE receiver
-- Based on the current Receiver Master shown by the user:
--   ID 2 = B Reddy Cash
--   ID 3 = B Reddy Phone Pe
--   ID 1 = Kiran (kept separate)
--
-- Run this once AFTER the V5 authentication SQL and V6 purchase-rate SQL.
-- This migration keeps old transactions and converts the old receiver split
-- into one receiver (ID 2) with a separate payment_mode field.

-- 1) Add payment mode to money movement tables.
alter table public.collections
  add column if not exists payment_mode text not null default 'CASH';

alter table public.purchases
  add column if not exists payment_mode text not null default 'CASH';

alter table public.expenses
  add column if not exists payment_mode text not null default 'CASH';

-- 2) Make the allowed values explicit.
alter table public.collections drop constraint if exists collections_payment_mode_check;
alter table public.collections add constraint collections_payment_mode_check
  check (payment_mode in ('CASH','PHONEPE'));

alter table public.purchases drop constraint if exists purchases_payment_mode_check;
alter table public.purchases add constraint purchases_payment_mode_check
  check (payment_mode in ('CASH','PHONEPE'));

alter table public.expenses drop constraint if exists expenses_payment_mode_check;
alter table public.expenses add constraint expenses_payment_mode_check
  check (payment_mode in ('CASH','PHONEPE'));

-- 3) Recover the old payment method BEFORE changing receiver IDs.
-- Old ID 2 was B Reddy Cash; old ID 3 was B Reddy Phone Pe.
update public.collections
set payment_mode = case when receiver_id = 3 then 'PHONEPE' else 'CASH' end
where receiver_id in (2,3);

update public.purchases
set payment_mode = case when receiver_id = 3 then 'PHONEPE' else 'CASH' end
where receiver_id in (2,3);

update public.expenses
set payment_mode = case when receiver_id = 3 then 'PHONEPE' else 'CASH' end
where receiver_id in (2,3);

-- 4) Merge all historical references from receiver 3 into receiver 2.
update public.collections set receiver_id = 2 where receiver_id = 3;
update public.purchases set receiver_id = 2 where receiver_id = 3;
update public.purchases set charges_receiver_id = 2 where charges_receiver_id = 3;
update public.expenses set receiver_id = 2 where receiver_id = 3;
update public.user_profiles set receiver_id = 2 where receiver_id = 3;

-- 5) Merge the opening/current balances so no old money is lost.
do $$
declare
  r2_open numeric(14,2);
  r3_open numeric(14,2);
  r2_current numeric(14,2);
  r3_current numeric(14,2);
begin
  select coalesce(opening_balance,0), coalesce(current_balance,0)
    into r2_open, r2_current
    from public.receivers where id=2;
  select coalesce(opening_balance,0), coalesce(current_balance,0)
    into r3_open, r3_current
    from public.receivers where id=3;

  update public.receivers
  set receiver_name='B Reddy',
      receiver_type='Other',
      opening_balance=r2_open+r3_open,
      current_balance=r2_current+r3_current,
      status=true
  where id=2;

  -- Keep the old row for historical referential integrity, but do not show it
  -- as an active receiver in the application.
  update public.receivers
  set status=false,
      receiver_name='B Reddy Phone Pe (Merged - Old)'
  where id=3;
end $$;

-- 6) Verify the migration.
select id, receiver_name, receiver_type, opening_balance, current_balance, status
from public.receivers
order by id;

select receiver_id, payment_mode, count(*) as transaction_count, sum(total_amount) as amount
from public.collections
where receiver_id=2
group by receiver_id, payment_mode
order by payment_mode;

select id, full_name, email, role, receiver_id, status
from public.user_profiles
where receiver_id=2;
