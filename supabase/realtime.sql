-- Run this once in Supabase SQL Editor to enable live updates
-- between different browser/mobile users without manual refresh.

do $$
begin
  begin alter publication supabase_realtime add table customers; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table item_master; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table receivers; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table suppliers; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table sales; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table collections; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table collection_allocations; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table purchases; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table purchase_items; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table stock_transactions; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table expense_types; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table expenses; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table audit_logs; exception when duplicate_object then null; end;
end $$;
