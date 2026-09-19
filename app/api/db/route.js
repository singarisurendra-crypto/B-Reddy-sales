import { NextResponse } from 'next/server';
import { getCurrentUser } from '../server/session';
import { supabaseAdmin } from '../server/supabaseAdmin';

const READ_TABLES = new Set(['customers','item_master','receivers','suppliers','sales','sale_items','collections','collection_allocations','purchases','purchase_items','stock_transactions','expense_types','expenses','audit_logs','user_profiles']);
const MUTATION_TABLES = new Set([...READ_TABLES].filter(x => x !== 'audit_logs' && x !== 'user_profiles'));
const RECEIVER_INSERT = new Set(['customers','sales','sale_items','stock_transactions','collections','collection_allocations']);
const RECEIVER_UPDATE = new Set(['customers','sales','collections','collection_allocations','receivers']);
const RECEIVER_DELETE = new Set();
const ALLOWED_RPCS = new Set(['next_invoice_number','next_purchase_number']);

function deny(msg, status=403){ return NextResponse.json({error:msg},{status}); }
function filterQuery(q, filters){
  for(const f of filters || []) if(f.op === 'eq') q = q.eq(f.column, f.value);
  return q;
}

async function audit(user, table, action, recordId, details={}) {
  if(table === 'audit_logs') return;
  await supabaseAdmin.from('audit_logs').insert({
    table_name: table,
    record_id: recordId == null ? null : Number(recordId),
    action: String(action).toUpperCase(),
    details,
    user_id: user.id,
    user_name: user.full_name,
    user_role: user.role,
  });
}

export async function POST(request){
  const user = await getCurrentUser();
  if(!user) return deny('Login required.',401);
  let body;
  try { body = await request.json(); } catch { return deny('Invalid request.',400); }

  if(body.action === 'rpc'){
    if(!ALLOWED_RPCS.has(body.rpc)) return deny('RPC not allowed.');
    const {data,error} = await supabaseAdmin.rpc(body.rpc, body.args || {});
    if(error) return NextResponse.json({error:error.message},{status:400});
    return NextResponse.json({data,error:null});
  }

  const table = body.table;
  if(!READ_TABLES.has(table)) return deny('Table is not available.');
  const action = body.action || 'select';
  const isAdmin = user.role === 'admin';

  if(action === 'select'){
    if(table === 'user_profiles' && !isAdmin) return NextResponse.json({data:[],error:null});
    let q = supabaseAdmin.from(table).select(body.select || '*');
    q = filterQuery(q, body.filters);
    for(const o of body.order || []) q = q.order(o.column,{ascending:o.ascending !== false});
    if(body.limit) q = q.limit(Number(body.limit));
    if(body.single) q = q.single();
    else if(body.maybeSingle) q = q.maybeSingle();
    const {data,error} = await q;
    if(error) return NextResponse.json({error:error.message},{status:400});
    return NextResponse.json({data,error:null});
  }

  if(!MUTATION_TABLES.has(table)) return deny('This table cannot be modified from the application.');
  if(!isAdmin){
    if(action==='insert' && !RECEIVER_INSERT.has(table)) return deny('Receiver cannot create this record.');
    if(action==='update' && !RECEIVER_UPDATE.has(table)) return deny('Receiver cannot update this record.');
    if(action==='delete' && !RECEIVER_DELETE.has(table)) return deny('Receiver cannot delete records.');
  }

  // Receivers can only modify their own receiver row.
  if(!isAdmin && table === 'receivers'){
    const own = (body.filters || []).find(f=>f.op==='eq' && f.column==='id');
    if(!own || Number(own.value) !== Number(user.receiver_id)) return deny('Receiver can update only their own receiver account.');
  }
  // Receivers can only create collections for themselves.
  if(!isAdmin && (table === 'collections' || table === 'expenses')){
    const rows = Array.isArray(body.data) ? body.data : [body.data];
    for(const row of rows){
      if(table === 'collections' && Number(row.receiver_id) !== Number(user.receiver_id)) return deny('Collection receiver does not match the logged-in receiver.');
      if(table === 'expenses' && row.receiver_id && Number(row.receiver_id) !== Number(user.receiver_id)) return deny('Expense receiver does not match the logged-in receiver.');
    }
  }

  let q;
  if(action === 'insert') q = supabaseAdmin.from(table).insert(body.data);
  else if(action === 'update') { q = supabaseAdmin.from(table).update(body.data); q=filterQuery(q,body.filters); }
  else if(action === 'delete') { q = supabaseAdmin.from(table).delete(); q=filterQuery(q,body.filters); }
  else return deny('Unsupported action.',400);

  if(body.select) q = q.select(body.select);
  if(body.single) q = q.single();
  else if(body.maybeSingle) q = q.maybeSingle();
  const {data,error} = await q;
  if(error) return NextResponse.json({error:error.message},{status:400});

  const rows = Array.isArray(data) ? data : (data ? [data] : (Array.isArray(body.data) ? body.data : [body.data || {}]));
  for(const row of rows){
    const id = row?.id ?? row?.record_id ?? null;
    await audit(user, table, action, id, { source:'application', fields: action==='insert' ? Object.keys(row || {}) : Object.keys(body.data || {}) });
  }
  return NextResponse.json({data,error:null});
}
