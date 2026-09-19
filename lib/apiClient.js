async function request(body) {
  const res = await fetch('/api/db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { data: null, error: { message: json.error || `Request failed (${res.status})` } };
  return json;
}

class QueryBuilder {
  constructor(table) {
    this.spec = { table, action: 'select', filters: [], order: [], limit: null, select: '*', single: false, maybeSingle: false };
  }
  select(columns='*') { this.spec.select = columns; this.spec.action = this.spec.action === 'select' ? 'select' : this.spec.action; return this; }
  eq(column, value) { this.spec.filters.push({ op:'eq', column, value }); return this; }
  order(column, options={}) { this.spec.order.push({ column, ascending: options.ascending !== false }); return this; }
  limit(value) { this.spec.limit = value; return this; }
  insert(values) { this.spec.action='insert'; this.spec.data=values; return this; }
  update(values) { this.spec.action='update'; this.spec.data=values; return this; }
  delete() { this.spec.action='delete'; return this; }
  single() { this.spec.single=true; this.spec.maybeSingle=false; return this; }
  maybeSingle() { this.spec.maybeSingle=true; this.spec.single=false; return this; }
  then(resolve, reject) { return request(this.spec).then(resolve, reject); }
  catch(reject) { return this.then(undefined, reject); }
}

export const db = {
  from(table) { return new QueryBuilder(table); },
  async rpc(name, args={}) { return request({ action:'rpc', rpc:name, args }); },
};
