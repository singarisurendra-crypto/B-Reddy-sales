-- B Reddy Sales V6 - Purchase-rate stock costing and historical profit
-- Run this once after V5 authentication SQL.

alter table public.sale_items
  add column if not exists cost_rate numeric(14,2);

alter table public.stock_transactions
  add column if not exists cost_rate numeric(14,2);

-- Preserve existing invoice profit calculations as a one-time fallback.
-- New invoices will always save the actual selected purchase rate.
update public.sale_items si
set cost_rate = im.purchase_rate
from public.item_master im
where si.item_id = im.id
  and si.cost_rate is null;

-- Existing SALE stock transactions can use the same historical cost rate.
update public.stock_transactions st
set cost_rate = si.cost_rate
from public.sale_items si
where st.transaction_type = 'SALE'
  and st.reference_id = si.sale_id
  and st.item_id = si.item_id
  and st.cost_rate is null;

-- Keep the existing authenticated policies; these columns inherit the table policies.
