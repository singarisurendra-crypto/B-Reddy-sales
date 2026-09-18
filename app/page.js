 "use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN", {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
const today = () => new Date().toISOString().slice(0, 10);

const emptyCustomer = { customer_name: "", mobile_no: "", address: "", opening_due: 0 };
const emptyItem = { master_name: "", item_name: "", sale_rate: 0, purchase_rate: 0, opening_stock: 0, minimum_stock: 0 };
const emptyReceiver = { receiver_name: "", receiver_type: "Cash", opening_balance: 0, current_balance: 0 };
const emptySupplier = { supplier_name: "", mobile_no: "", address: "", opening_due: 0 };

export default function Home() {
  const [screen, setScreen] = useState("dashboard");
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);
  const [receivers, setReceivers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [sales, setSales] = useState([]);
  const [collections, setCollections] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [stockTxns, setStockTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [customerForm, setCustomerForm] = useState(emptyCustomer);
  const [itemForm, setItemForm] = useState(emptyItem);
  const [receiverForm, setReceiverForm] = useState(emptyReceiver);
  const [supplierForm, setSupplierForm] = useState(emptySupplier);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [editingReceiver, setEditingReceiver] = useState(null);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [showReceiverForm, setShowReceiverForm] = useState(false);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [saleDate, setSaleDate] = useState(today());
  const [saleCustomer, setSaleCustomer] = useState("");
  const [saleItems, setSaleItems] = useState([{ item_id: "", rate: 0, qty: 1 }]);
  const [salePayment, setSalePayment] = useState("DUE");
  const [salePaid, setSalePaid] = useState(0);
  const [saleReceiver, setSaleReceiver] = useState("");
  const [paymentCustomer, setPaymentCustomer] = useState("");
  const [paymentAmounts, setPaymentAmounts] = useState({});
  const [paymentReceiver, setPaymentReceiver] = useState("");
  const [paymentDate, setPaymentDate] = useState(today());
  const [paymentNote, setPaymentNote] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(today());
  const [purchaseSupplier, setPurchaseSupplier] = useState("");
  const [purchaseItems, setPurchaseItems] = useState([{ item_id: "", rate: 0, qty: 1 }]);
  const [purchasePayment, setPurchasePayment] = useState("DUE");
  const [purchasePaid, setPurchasePaid] = useState(0);
  const [purchaseReceiver, setPurchaseReceiver] = useState("");

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const queries = await Promise.all([
      supabase.from("customers").select("*").eq("status", true).order("customer_name"),
      supabase.from("item_master").select("*").eq("status", true).order("item_name"),
      supabase.from("receivers").select("*").eq("status", true).order("receiver_name"),
      supabase.from("suppliers").select("*").eq("status", true).order("supplier_name"),
      supabase.from("sales").select("*, customers(customer_name, mobile_no), sale_items(*, item_master(item_name, master_name))").order("invoice_date", { ascending: false }),
      supabase.from("collections").select("*, customers(customer_name), receivers(receiver_name), collection_allocations(*, sales(invoice_no))").order("collection_date", { ascending: false }),
      supabase.from("purchases").select("*, suppliers(supplier_name), receivers(receiver_name), purchase_items(*, item_master(item_name))").order("purchase_date", { ascending: false }),
      supabase.from("stock_transactions").select("*, item_master(item_name, master_name)").order("transaction_date", { ascending: true })
    ]);
    const [c,i,r,s,sa,co,pu,st] = queries;
    const firstError = [c,i,r,s,sa,co,pu,st].find(x => x.error);
    if (firstError) setNotice(firstError.error.message);
    setCustomers(c.data || []); setItems(i.data || []); setReceivers(r.data || []);
    setSuppliers(s.data || []); setSales(sa.data || []); setCollections(co.data || []);
    setPurchases(pu.data || []); setStockTxns(st.data || []);
    setLoading(false);
  }

  function flash(msg) { setNotice(msg); setTimeout(() => setNotice(""), 3500); }
  function go(id) { setScreen(id); window.scrollTo({top:0, behavior:"smooth"}); }

  const stockMap = useMemo(() => {
    const m = {};
    items.forEach(x => m[x.id] = Number(x.opening_stock || 0));
    stockTxns.forEach(x => {
      m[x.item_id] = Number(m[x.item_id] || 0) + Number(x.qty_in || 0) - Number(x.qty_out || 0);
    });
    return m;
  }, [items, stockTxns]);

  const customerDue = (customerId) => {
    const c = customers.find(x => x.id === Number(customerId));
    return Number(c?.opening_due || 0) +
      sales.filter(x => x.customer_id === Number(customerId)).reduce((a,x) => a + Number(x.due_amount || 0), 0);
  };

  const saleTotal = saleItems.reduce((a,x) => a + Number(x.rate || 0) * Number(x.qty || 0), 0);
  const purchaseTotal = purchaseItems.reduce((a,x) => a + Number(x.rate || 0) * Number(x.qty || 0), 0);
  const paidForSale = salePayment === "PAID" ? saleTotal : salePayment === "PARTIAL" ? Math.min(Number(salePaid || 0), saleTotal) : 0;
  const dueForSale = saleTotal - paidForSale;
  const paidForPurchase = purchasePayment === "PAID" ? purchaseTotal : purchasePayment === "PARTIAL" ? Math.min(Number(purchasePaid || 0), purchaseTotal) : 0;
  const dueForPurchase = purchaseTotal - paidForPurchase;

  const dashboardSales = sales.reduce((a,x) => a + Number(x.total_amount || 0), 0);
  const dashboardCollections = collections.reduce((a,x) => a + Number(x.total_amount || 0), 0);
  const dashboardDue = sales.reduce((a,x) => a + Number(x.due_amount || 0), 0) + customers.reduce((a,x) => a + Number(x.opening_due || 0), 0);
  const dashboardStock = Object.values(stockMap).reduce((a,x) => a + Number(x || 0), 0);

  async function saveCustomer(e) {
    e.preventDefault();
    if (!customerForm.customer_name.trim()) return flash("Customer name is required.");
    const payload = {...customerForm, opening_due: Number(customerForm.opening_due || 0)};
    const q = editingCustomer
      ? supabase.from("customers").update(payload).eq("id", editingCustomer)
      : supabase.from("customers").insert(payload);
    const { error } = await q;
    if (error) return flash(error.message);
    setCustomerForm(emptyCustomer); setEditingCustomer(null); setShowCustomerForm(false);
    await loadAll(); flash("Customer saved.");
  }

  async function deleteCustomer(id) {
    if (!confirm("Delete this customer?")) return;
    const { error } = await supabase.from("customers").update({status:false}).eq("id", id);
    if (error) return flash(error.message);
    await loadAll(); flash("Customer deleted.");
  }

  async function saveItem(e) {
    e.preventDefault();
    if (!itemForm.item_name.trim()) return flash("Item name is required.");
    const payload = {...itemForm, sale_rate:Number(itemForm.sale_rate||0), purchase_rate:Number(itemForm.purchase_rate||0), opening_stock:Number(itemForm.opening_stock||0), minimum_stock:Number(itemForm.minimum_stock||0)};
    const q = editingItem ? supabase.from("item_master").update(payload).eq("id", editingItem) : supabase.from("item_master").insert(payload);
    const { error } = await q;
    if (error) return flash(error.message);
    setItemForm(emptyItem); setEditingItem(null); setShowItemForm(false); await loadAll(); flash("Item saved.");
  }

  async function deleteItem(id) {
    if (!confirm("Delete this item?")) return;
    const { error } = await supabase.from("item_master").update({status:false}).eq("id", id);
    if (error) return flash(error.message);
    await loadAll(); flash("Item deleted.");
  }

  async function saveReceiver(e) {
    e.preventDefault();
    if (!receiverForm.receiver_name.trim()) return flash("Receiver name is required.");
    const payload = {...receiverForm, opening_balance:Number(receiverForm.opening_balance||0), current_balance:Number(receiverForm.current_balance || receiverForm.opening_balance || 0)};
    const q = editingReceiver ? supabase.from("receivers").update(payload).eq("id", editingReceiver) : supabase.from("receivers").insert(payload);
    const { error } = await q;
    if (error) return flash(error.message);
    setReceiverForm(emptyReceiver); setEditingReceiver(null); setShowReceiverForm(false); await loadAll(); flash("Receiver saved.");
  }

  async function deleteReceiver(id) {
    if (!confirm("Delete this receiver?")) return;
    const { error } = await supabase.from("receivers").update({status:false}).eq("id", id);
    if (error) return flash(error.message);
    await loadAll(); flash("Receiver deleted.");
  }

  async function saveSupplier(e) {
    e.preventDefault();
    if (!supplierForm.supplier_name.trim()) return flash("Supplier name is required.");
    const payload = {...supplierForm, opening_due:Number(supplierForm.opening_due||0)};
    const q = editingSupplier ? supabase.from("suppliers").update(payload).eq("id", editingSupplier) : supabase.from("suppliers").insert(payload);
    const { error } = await q;
    if (error) return flash(error.message);
    setSupplierForm(emptySupplier); setEditingSupplier(null); setShowSupplierForm(false); await loadAll(); flash("Supplier saved.");
  }

  async function deleteSupplier(id) {
    if (!confirm("Delete this supplier?")) return;
    const { error } = await supabase.from("suppliers").update({status:false}).eq("id", id);
    if (error) return flash(error.message);
    await loadAll(); flash("Supplier deleted.");
  }

  function setSaleItem(index, key, value) {
    setSaleItems(prev => prev.map((x,i) => {
      if (i !== index) return x;
      if (key === "item_id") {
        const it = items.find(a => a.id === Number(value));
        return {...x, item_id:value, rate:it?.sale_rate || 0};
      }
      return {...x, [key]:value};
    }));
  }

  async function createSale(e) {
    e.preventDefault();
    if (!saleCustomer) return flash("Select a customer.");
    if (!saleItems.length || saleItems.some(x => !x.item_id || Number(x.qty) <= 0)) return flash("Select valid sale items.");
    for (const x of saleItems) {
      if (Number(x.qty) > Number(stockMap[x.item_id] || 0)) return flash(`Insufficient stock for ${items.find(i=>i.id===Number(x.item_id))?.item_name || "item"}.`);
    }
    const { data: inv, error: invErr } = await supabase.rpc("next_invoice_number");
    if (invErr) return flash("Run the supplied Supabase SQL first. Invoice number function is missing.");
    const { data: sale, error } = await supabase.from("sales").insert({
      invoice_no: inv, invoice_date:saleDate, customer_id:Number(saleCustomer),
      total_amount:saleTotal, paid_amount:paidForSale, due_amount:dueForSale,
      payment_status: salePayment
    }).select().single();
    if (error) return flash(error.message);
    const rows = saleItems.map(x => ({sale_id:sale.id, item_id:Number(x.item_id), rate:Number(x.rate), qty:Number(x.qty), amount:Number(x.rate)*Number(x.qty)}));
    const { error:itemErr } = await supabase.from("sale_items").insert(rows);
    if (itemErr) return flash(itemErr.message);
    const stockRows = saleItems.map(x => ({transaction_date:saleDate, item_id:Number(x.item_id), transaction_type:"SALE", reference_id:sale.id, qty_in:0, qty_out:Number(x.qty), rate:Number(x.rate)}));
    const { error:stockErr } = await supabase.from("stock_transactions").insert(stockRows);
    if (stockErr) return flash(stockErr.message);
    if (paidForSale > 0 && saleReceiver) {
      await supabase.from("collections").insert({collection_no:`COL-${Date.now()}`, collection_date:saleDate, customer_id:Number(saleCustomer), receiver_id:Number(saleReceiver), total_amount:paidForSale, remarks:`Payment for ${inv}`});
      const {data:col} = await supabase.from("collections").select("id").eq("collection_no",`COL-${Date.now()}`).maybeSingle();
      void col;
      await supabase.from("receivers").update({current_balance: Number(receivers.find(r=>r.id===Number(saleReceiver))?.current_balance||0)+paidForSale}).eq("id",Number(saleReceiver));
    }
    setSaleCustomer(""); setSaleItems([{item_id:"",rate:0,qty:1}]); setSalePayment("DUE"); setSalePaid(0); setSaleReceiver("");
    await loadAll(); go("dashboard"); flash(`${inv} saved successfully.`);
  }

  async function makePayment(e) {
    e.preventDefault();
    if (!paymentCustomer || !paymentReceiver) return flash("Select customer and receiver.");
    const allocations = Object.entries(paymentAmounts).filter(([,v]) => Number(v) > 0);
    if (!allocations.length) return flash("Enter a payment amount.");
    const total = allocations.reduce((a,[,v])=>a+Number(v),0);
    const receiver = receivers.find(x=>x.id===Number(paymentReceiver));
    const {data:col,error} = await supabase.from("collections").insert({
      collection_no:`COL-${Date.now()}`, collection_date:paymentDate, customer_id:Number(paymentCustomer),
      receiver_id:Number(paymentReceiver), total_amount:total, remarks:paymentNote
    }).select().single();
    if (error) return flash(error.message);
    const rows = allocations.map(([saleId,v])=>({collection_id:col.id,sale_id:Number(saleId),amount:Number(v)}));
    const {error:aErr}=await supabase.from("collection_allocations").insert(rows);
    if (aErr) return flash(aErr.message);
    for (const [saleId,v] of allocations) {
      const sale=sales.find(x=>x.id===Number(saleId));
      if (!sale) continue;
      const newPaid=Math.min(Number(sale.total_amount),Number(sale.paid_amount||0)+Number(v));
      const newDue=Math.max(0,Number(sale.total_amount)-newPaid);
      await supabase.from("sales").update({paid_amount:newPaid,due_amount:newDue,payment_status:newDue===0?"PAID":"PARTIAL"}).eq("id",sale.id);
    }
    await supabase.from("receivers").update({current_balance:Number(receiver?.current_balance||0)+total}).eq("id",Number(paymentReceiver));
    setPaymentAmounts({}); setPaymentCustomer(""); setPaymentReceiver(""); setPaymentNote("");
    await loadAll(); go("collections"); flash("Payment recorded.");
  }

  async function createPurchase(e) {
    e.preventDefault();
    if (!purchaseSupplier) return flash("Select supplier.");
    if (purchaseItems.some(x=>!x.item_id || Number(x.qty)<=0)) return flash("Select valid purchase items.");
    const {data:no,error:noErr}=await supabase.rpc("next_purchase_number");
    if (noErr) return flash("Run the supplied Supabase SQL first. Purchase number function is missing.");
    const {data:pur,error}=await supabase.from("purchases").insert({
      purchase_no:no,purchase_date:purchaseDate,supplier_id:Number(purchaseSupplier),
      total_amount:purchaseTotal,paid_amount:paidForPurchase,due_amount:dueForPurchase,
      payment_status:purchasePayment,receiver_id:purchaseReceiver?Number(purchaseReceiver):null
    }).select().single();
    if (error) return flash(error.message);
    const rows=purchaseItems.map(x=>({purchase_id:pur.id,item_id:Number(x.item_id),rate:Number(x.rate),qty:Number(x.qty),amount:Number(x.rate)*Number(x.qty)}));
    const {error:piErr}=await supabase.from("purchase_items").insert(rows);
    if(piErr) return flash(piErr.message);
    const stockRows=purchaseItems.map(x=>({transaction_date:purchaseDate,item_id:Number(x.item_id),transaction_type:"PURCHASE",reference_id:pur.id,qty_in:Number(x.qty),qty_out:0,rate:Number(x.rate)}));
    const {error:stErr}=await supabase.from("stock_transactions").insert(stockRows);
    if(stErr) return flash(stErr.message);
    if(paidForPurchase && purchaseReceiver){
      const r=receivers.find(x=>x.id===Number(purchaseReceiver));
      await supabase.from("receivers").update({current_balance:Number(r?.current_balance||0)-paidForPurchase}).eq("id",Number(purchaseReceiver));
    }
    setPurchaseSupplier("");setPurchaseItems([{item_id:"",rate:0,qty:1}]);setPurchasePayment("DUE");setPurchasePaid(0);setPurchaseReceiver("");
    await loadAll();go("procurement");flash(`${no} saved successfully.`);
  }

  const filteredCustomers=customers.filter(c=>(c.customer_name+" "+(c.mobile_no||"")).toLowerCase().includes(customerSearch.toLowerCase()));
  const filteredItems=items.filter(i=>(i.item_name+" "+(i.master_name||"")).toLowerCase().includes(itemSearch.toLowerCase()));

  function CustomerForm() {
    return <div className="modal-backdrop"><div className="modal">
      <div className="modal-head"><h3>{editingCustomer?"Edit Customer":"Add Customer"}</h3><button onClick={()=>setShowCustomerForm(false)}>×</button></div>
      <form onSubmit={saveCustomer} className="grid-form">
        <label>Customer Name*<input value={customerForm.customer_name} onChange={e=>setCustomerForm({...customerForm,customer_name:e.target.value})}/></label>
        <label>Mobile Number<input value={customerForm.mobile_no} onChange={e=>setCustomerForm({...customerForm,mobile_no:e.target.value})}/></label>
        <label className="full">Address<textarea value={customerForm.address} onChange={e=>setCustomerForm({...customerForm,address:e.target.value})}/></label>
        <label>Opening Due<input type="number" step="0.01" value={customerForm.opening_due} onChange={e=>setCustomerForm({...customerForm,opening_due:e.target.value})}/></label>
        <div className="modal-actions"><button type="button" className="btn secondary" onClick={()=>setShowCustomerForm(false)}>Cancel</button><button className="btn primary">Save Customer</button></div>
      </form>
    </div></div>
  }
  function ItemForm() {
    return <div className="modal-backdrop"><div className="modal">
      <div className="modal-head"><h3>{editingItem?"Edit Item":"Add Item"}</h3><button onClick={()=>setShowItemForm(false)}>×</button></div>
      <form onSubmit={saveItem} className="grid-form">
        <label>Master / Category<input value={itemForm.master_name} onChange={e=>setItemForm({...itemForm,master_name:e.target.value})}/></label>
        <label>Item Name*<input value={itemForm.item_name} onChange={e=>setItemForm({...itemForm,item_name:e.target.value})}/></label>
        <label>Sale Rate<input type="number" step="0.01" value={itemForm.sale_rate} onChange={e=>setItemForm({...itemForm,sale_rate:e.target.value})}/></label>
        <label>Purchase Rate<input type="number" step="0.01" value={itemForm.purchase_rate} onChange={e=>setItemForm({...itemForm,purchase_rate:e.target.value})}/></label>
        <label>Opening Stock<input type="number" step="0.01" value={itemForm.opening_stock} onChange={e=>setItemForm({...itemForm,opening_stock:e.target.value})}/></label>
        <label>Minimum Stock<input type="number" step="0.01" value={itemForm.minimum_stock} onChange={e=>setItemForm({...itemForm,minimum_stock:e.target.value})}/></label>
        <div className="modal-actions"><button type="button" className="btn secondary" onClick={()=>setShowItemForm(false)}>Cancel</button><button className="btn primary">Save Item</button></div>
      </form>
    </div></div>
  }
  function ReceiverForm() {
    return <div className="modal-backdrop"><div className="modal">
      <div className="modal-head"><h3>{editingReceiver?"Edit Receiver":"Add Receiver"}</h3><button onClick={()=>setShowReceiverForm(false)}>×</button></div>
      <form onSubmit={saveReceiver} className="grid-form">
        <label>Receiver Name*<input value={receiverForm.receiver_name} onChange={e=>setReceiverForm({...receiverForm,receiver_name:e.target.value})}/></label>
        <label>Type<select value={receiverForm.receiver_type} onChange={e=>setReceiverForm({...receiverForm,receiver_type:e.target.value})}><option>Cash</option><option>Bank</option><option>UPI</option><option>Other</option></select></label>
        <label>Opening Balance<input type="number" step="0.01" value={receiverForm.opening_balance} onChange={e=>setReceiverForm({...receiverForm,opening_balance:e.target.value})}/></label>
        <div className="modal-actions"><button type="button" className="btn secondary" onClick={()=>setShowReceiverForm(false)}>Cancel</button><button className="btn primary">Save Receiver</button></div>
      </form>
    </div></div>
  }
  function SupplierForm() {
    return <div className="modal-backdrop"><div className="modal">
      <div className="modal-head"><h3>{editingSupplier?"Edit Supplier":"Add Supplier"}</h3><button onClick={()=>setShowSupplierForm(false)}>×</button></div>
      <form onSubmit={saveSupplier} className="grid-form">
        <label>Supplier Name*<input value={supplierForm.supplier_name} onChange={e=>setSupplierForm({...supplierForm,supplier_name:e.target.value})}/></label>
        <label>Mobile Number<input value={supplierForm.mobile_no} onChange={e=>setSupplierForm({...supplierForm,mobile_no:e.target.value})}/></label>
        <label className="full">Address<textarea value={supplierForm.address} onChange={e=>setSupplierForm({...supplierForm,address:e.target.value})}/></label>
        <label>Opening Due<input type="number" step="0.01" value={supplierForm.opening_due} onChange={e=>setSupplierForm({...supplierForm,opening_due:e.target.value})}/></label>
        <div className="modal-actions"><button type="button" className="btn secondary" onClick={()=>setShowSupplierForm(false)}>Cancel</button><button className="btn primary">Save Supplier</button></div>
      </form>
    </div></div>
  }

  function Sidebar() {
    const links=[["dashboard","🏠","Dashboard"],["sales","🧾","Sales"],["customers","👥","Customers"],["collections","💰","Collections"],["stock","📦","Stock"],["procurement","🛒","Procurement"],["reports","📊","Reports"],["master","⚙️","Master"]];
    return <aside className="sidebar"><div className="brand">B REDDY SALES<span>Retail Management</span></div>{links.map(([id,icon,label])=><button key={id} className={screen===id?"nav active":"nav"} onClick={()=>go(id)}>{icon}<span>{label}</span></button>)}</aside>
  }

  function Dashboard() {
    return <><Header title="Dashboard"><button className="btn primary" onClick={()=>go("create-sale")}>＋ Create Sale</button></Header>
      <div className="cards"><Card t="Total Sales" v={money(dashboardSales)}/><Card t="Collections" v={money(dashboardCollections)}/><Card t="Total Due" v={money(dashboardDue)}/><Card t="Available Stock" v={dashboardStock.toLocaleString("en-IN")}/></div>
      <div className="panel"><div className="toolbar"><input placeholder="Customer name / mobile" value={customerSearch} onChange={e=>setCustomerSearch(e.target.value)}/><select><option>All Items</option>{items.map(i=><option key={i.id}>{i.item_name}</option>)}</select><select><option>All Status</option><option>Paid</option><option>Partial</option><option>Due</option></select><button className="btn secondary" onClick={()=>setCustomerSearch(customerSearch)}>Search</button></div>
      <h3>Customer Due Summary</h3><Table><thead><tr><th>Customer</th><th>Total Due</th><th>Last Invoice</th><th>Due &gt; 30 Days</th><th>Status</th></tr></thead><tbody>{filteredCustomers.map(c=>{const due=customerDue(c.id);const cs=sales.filter(s=>s.customer_id===c.id);const last=cs[0]?.invoice_date||"-";const old=cs.filter(s=>Math.floor((Date.now()-new Date(s.invoice_date))/86400000)>30).reduce((a,x)=>a+Number(x.due_amount||0),0);return <tr key={c.id}><td className="link" onClick={()=>{setSelectedCustomer(c);go("customer-detail")}}>{c.customer_name}</td><td>{money(due)}</td><td>{last}</td><td>{money(old)}</td><td><Status status={due>0?"DUE":"PAID"}/></td></tr>})}{!filteredCustomers.length&&<Empty col="5" text="No customers yet. Add a customer from Master."/ >}</tbody></Table></div>
    </>;
  }
  function Card({t,v}){return <div className="card"><span>{t}</span><strong>{v}</strong></div>}
  function Header({title,children}){return <div className="header"><h1>{title}</h1><div>{children}</div></div>}
  function Table({children}){return <div className="table-wrap"><table>{children}</table></div>}
  function Empty({col,text}){return <tr><td colSpan={col} className="empty">{text}</td></tr>}
  function Status({status}){return <span className={"status "+String(status).toLowerCase()}>{status}</span>}

  function CreateSale() {
    const c=customers.find(x=>x.id===Number(saleCustomer));
    return <><Header title="Create Sale"><button className="btn secondary" onClick={()=>go("dashboard")}>Cancel</button></Header>
      <form className="panel" onSubmit={createSale}>
        <div className="grid-form"><label>Invoice Date<input type="date" value={saleDate} onChange={e=>setSaleDate(e.target.value)}/></label><label>Customer Name*<select value={saleCustomer} onChange={e=>setSaleCustomer(e.target.value)}><option value="">Select Customer</option>{customers.map(x=><option key={x.id} value={x.id}>{x.customer_name} — {x.mobile_no||"No mobile"}</option>)}</select></label><label>Mobile Number<input value={c?.mobile_no||""} readOnly/></label><label>Old Due<input value={c?money(customerDue(c.id)):money(0)} readOnly/></label></div>
        <div className="section-title">Items <button type="button" className="small-btn" onClick={()=>setSaleItems([...saleItems,{item_id:"",rate:0,qty:1}])}>＋ Add Item</button></div>
        <Table><thead><tr><th>Master</th><th>Item</th><th>Rate</th><th>Qty</th><th>Available</th><th>Amount</th><th></th></tr></thead><tbody>{saleItems.map((x,i)=>{const it=items.find(a=>a.id===Number(x.item_id));return <tr key={i}><td>{it?.master_name||"-"}</td><td><select value={x.item_id} onChange={e=>setSaleItem(i,"item_id",e.target.value)}><option value="">Select Item</option>{items.map(a=><option key={a.id} value={a.id}>{a.item_name}</option>)}</select></td><td><input type="number" step="0.01" value={x.rate} onChange={e=>setSaleItem(i,"rate",e.target.value)}/></td><td><input type="number" min="1" step="0.01" value={x.qty} onChange={e=>setSaleItem(i,"qty",e.target.value)}/></td><td>{Number(stockMap[x.item_id]||0)}</td><td>{money(Number(x.rate)*Number(x.qty))}</td><td><button type="button" className="icon-btn" onClick={()=>setSaleItems(saleItems.length>1?saleItems.filter((_,j)=>j!==i):saleItems)}>×</button></td></tr>})}</tbody></Table>
        <div className="sale-bottom"><div className="total">Total Value <b>{money(saleTotal)}</b></div><div className="payment-box"><label>Payment Status<select value={salePayment} onChange={e=>setSalePayment(e.target.value)}><option value="PAID">Paid</option><option value="PARTIAL">Partially Paid</option><option value="DUE">Due</option></select></label>{salePayment==="PARTIAL"&&<label>Paid Amount<input type="number" min="0" step="0.01" value={salePaid} onChange={e=>setSalePaid(e.target.value)}/></label>}{salePayment!=="DUE"&&<label>Receiver<select value={saleReceiver} onChange={e=>setSaleReceiver(e.target.value)}><option value="">Select Receiver</option>{receivers.map(r=><option key={r.id} value={r.id}>{r.receiver_name}</option>)}</select></label>}<div className="due-preview">Balance Due: <b>{money(dueForSale)}</b></div></div></div>
        <div className="form-actions"><button className="btn primary">Save Sale</button></div>
      </form>
    </>
  }

  function Customers() {return <><Header title="Customers"><button className="btn primary" onClick={()=>{setEditingCustomer(null);setCustomerForm(emptyCustomer);setShowCustomerForm(true)}}>＋ Add Customer</button></Header><div className="panel"><div className="toolbar"><input placeholder="Search name or mobile" value={customerSearch} onChange={e=>setCustomerSearch(e.target.value)}/></div><Table><thead><tr><th>Customer</th><th>Mobile</th><th>Address</th><th>Opening Due</th><th>Current Due</th><th>Action</th></tr></thead><tbody>{filteredCustomers.map(c=><tr key={c.id}><td className="link" onClick={()=>{setSelectedCustomer(c);go("customer-detail")}}>{c.customer_name}</td><td>{c.mobile_no||"-"}</td><td>{c.address||"-"}</td><td>{money(c.opening_due)}</td><td>{money(customerDue(c.id))}</td><td><button className="text-btn" onClick={()=>{setEditingCustomer(c.id);setCustomerForm({customer_name:c.customer_name,mobile_no:c.mobile_no||"",address:c.address||"",opening_due:c.opening_due});setShowCustomerForm(true)}}>Edit</button><button className="text-btn danger" onClick={()=>deleteCustomer(c.id)}>Delete</button></td></tr>)}{!filteredCustomers.length&&<Empty col="6" text="No customers found."/ >}</tbody></Table></div>{showCustomerForm&&<CustomerForm/>}</>}

  function CustomerDetail(){const c=selectedCustomer;const list=sales.filter(s=>s.customer_id===c?.id);return <><Header title={c?c.customer_name:"Customer"}><button className="btn secondary" onClick={()=>go("customers")}>Back</button><button className="btn primary" onClick={()=>go("payment")}>＋ Make Payment</button></Header><div className="cards"><Card t="Mobile" v={c?.mobile_no||"-"}/><Card t="Total Due" v={money(customerDue(c?.id))}/><Card t="Invoices" v={list.length}/><Card t="30+ Days Due" v={money(list.filter(s=>Math.floor((Date.now()-new Date(s.invoice_date))/86400000)>30).reduce((a,x)=>a+Number(x.due_amount||0),0))}/></div><div className="panel"><h3>All Invoices</h3><Table><thead><tr><th>Invoice</th><th>Date</th><th>Amount</th><th>Paid</th><th>Due</th><th>Status</th></tr></thead><tbody>{list.map(s=><tr key={s.id}><td className="link" onClick={()=>{setSelectedInvoice(s);go("invoice-detail")}}>{s.invoice_no}</td><td>{s.invoice_date}</td><td>{money(s.total_amount)}</td><td>{money(s.paid_amount)}</td><td>{money(s.due_amount)}</td><td><Status status={s.payment_status}/></td></tr>)}{!list.length&&<Empty col="6" text="No invoices for this customer."/ >}</tbody></Table></div></>}

  function InvoiceDetail(){const s=selectedInvoice;return <><Header title={s?.invoice_no||"Invoice"}><button className="btn secondary" onClick={()=>go("customer-detail")}>Back</button></Header><div className="panel invoice"><div className="invoice-head"><div><b>{s?.customers?.customer_name}</b><div>{s?.customers?.mobile_no}</div></div><div>Date: {s?.invoice_date}</div></div><Table><thead><tr><th>Master</th><th>Item</th><th>Rate</th><th>Qty</th><th>Amount</th></tr></thead><tbody>{(s?.sale_items||[]).map(x=><tr key={x.id}><td>{x.item_master?.master_name||"-"}</td><td>{x.item_master?.item_name}</td><td>{money(x.rate)}</td><td>{x.qty}</td><td>{money(x.amount)}</td></tr>)}</tbody></Table><div className="invoice-total">Total {money(s?.total_amount)} · Paid {money(s?.paid_amount)} · Due {money(s?.due_amount)}</div></div></>}

  function Sales(){return <><Header title="Sales / Invoices"><button className="btn primary" onClick={()=>go("create-sale")}>＋ Create Sale</button></Header><div className="panel"><Table><thead><tr><th>Invoice</th><th>Date</th><th>Customer</th><th>Amount</th><th>Paid</th><th>Due</th><th>Status</th></tr></thead><tbody>{sales.map(s=><tr key={s.id}><td className="link" onClick={()=>{setSelectedInvoice(s);go("invoice-detail")}}>{s.invoice_no}</td><td>{s.invoice_date}</td><td>{s.customers?.customer_name}</td><td>{money(s.total_amount)}</td><td>{money(s.paid_amount)}</td><td>{money(s.due_amount)}</td><td><Status status={s.payment_status}/></td></tr>)}{!sales.length&&<Empty col="7" text="No sales yet."/ >}</tbody></Table></div></>}

  function Payment(){const dueSales=sales.filter(s=>s.customer_id===Number(paymentCustomer)&&Number(s.due_amount)>0);return <><Header title="Make Payment"><button className="btn secondary" onClick={()=>go("dashboard")}>Cancel</button></Header><form className="panel" onSubmit={makePayment}><div className="grid-form"><label>Customer*<select value={paymentCustomer} onChange={e=>{setPaymentCustomer(e.target.value);setPaymentAmounts({})}}><option value="">Select Customer</option>{customers.map(c=><option key={c.id} value={c.id}>{c.customer_name} — {c.mobile_no||""}</option>)}</select></label><label>Payment Date<input type="date" value={paymentDate} onChange={e=>setPaymentDate(e.target.value)}/></label><label>Receiver*<select value={paymentReceiver} onChange={e=>setPaymentReceiver(e.target.value)}><option value="">Select Receiver</option>{receivers.map(r=><option key={r.id} value={r.id}>{r.receiver_name} ({money(r.current_balance)})</option>)}</select></label></div><h3>Outstanding Invoices</h3><Table><thead><tr><th>Invoice</th><th>Date</th><th>Invoice Amount</th><th>Paid</th><th>Balance</th><th>Payment</th></tr></thead><tbody>{dueSales.map(s=><tr key={s.id}><td>{s.invoice_no}</td><td>{s.invoice_date}</td><td>{money(s.total_amount)}</td><td>{money(s.paid_amount)}</td><td>{money(s.due_amount)}</td><td><input type="number" min="0" max={s.due_amount} step="0.01" value={paymentAmounts[s.id]||""} onChange={e=>setPaymentAmounts({...paymentAmounts,[s.id]:e.target.value})}/></td></tr>)}{!dueSales.length&&<Empty col="6" text={paymentCustomer?"No outstanding invoices.":"Select a customer to see due invoices."}/>}</tbody></Table><label className="note-label">Remarks<textarea value={paymentNote} onChange={e=>setPaymentNote(e.target.value)} placeholder="Optional"/></label><div className="form-actions"><button className="btn primary">Save Payment</button></div></form></>}

  function Collections(){return <><Header title="Collections"><button className="btn primary" onClick={()=>go("payment")}>＋ Make Payment</button></Header><div className="panel"><Table><thead><tr><th>Collection No.</th><th>Date</th><th>Customer</th><th>Receiver</th><th>Amount</th><th>Remarks</th></tr></thead><tbody>{collections.map(c=><tr key={c.id}><td>{c.collection_no}</td><td>{c.collection_date}</td><td>{c.customers?.customer_name}</td><td>{c.receivers?.receiver_name}</td><td>{money(c.total_amount)}</td><td>{c.remarks||"-"}</td></tr>)}{!collections.length&&<Empty col="6" text="No collections yet."/ >}</tbody></Table></div></>}

  function Stock(){return <><Header title="Stock"><button className="btn secondary" onClick={()=>go("master")}>Manage Items</button></Header><div className="panel"><Table><thead><tr><th>Master</th><th>Item</th><th>Opening</th><th>Purchase</th><th>Sales</th><th>Available</th><th>Minimum</th></tr></thead><tbody>{items.map(i=>{const tx=stockTxns.filter(x=>x.item_id===i.id);const p=tx.reduce((a,x)=>a+Number(x.qty_in||0),0);const s=tx.reduce((a,x)=>a+Number(x.qty_out||0),0);return <tr key={i.id} className={stockMap[i.id]<=Number(i.minimum_stock||0)?"low-stock":""}><td>{i.master_name||"-"}</td><td>{i.item_name}</td><td>{i.opening_stock}</td><td>{p}</td><td>{s}</td><td><b>{stockMap[i.id]||0}</b></td><td>{i.minimum_stock}</td></tr>})}{!items.length&&<Empty col="7" text="No items yet."/ >}</tbody></Table></div></>}

  function Procurement(){return <><Header title="Procurement"><button className="btn primary" onClick={()=>go("purchase")}>＋ Purchase</button></Header><div className="panel"><Table><thead><tr><th>Purchase</th><th>Date</th><th>Supplier</th><th>Total</th><th>Paid</th><th>Due</th><th>Status</th></tr></thead><tbody>{purchases.map(p=><tr key={p.id}><td>{p.purchase_no}</td><td>{p.purchase_date}</td><td>{p.suppliers?.supplier_name}</td><td>{money(p.total_amount)}</td><td>{money(p.paid_amount)}</td><td>{money(p.due_amount)}</td><td><Status status={p.payment_status}/></td></tr>)}{!purchases.length&&<Empty col="7" text="No purchases yet."/ >}</tbody></Table></div></>}

  function Purchase(){return <><Header title="New Purchase"><button className="btn secondary" onClick={()=>go("procurement")}>Cancel</button></Header><form className="panel" onSubmit={createPurchase}><div className="grid-form"><label>Purchase Date<input type="date" value={purchaseDate} onChange={e=>setPurchaseDate(e.target.value)}/></label><label>From / Supplier*<select value={purchaseSupplier} onChange={e=>setPurchaseSupplier(e.target.value)}><option value="">Select Supplier</option>{suppliers.map(s=><option key={s.id} value={s.id}>{s.supplier_name}</option>)}</select></label></div><div className="section-title">Items <button type="button" className="small-btn" onClick={()=>setPurchaseItems([...purchaseItems,{item_id:"",rate:0,qty:1}])}>＋ Add Item</button></div><Table><thead><tr><th>Item</th><th>Rate</th><th>Qty</th><th>Amount</th><th></th></tr></thead><tbody>{purchaseItems.map((x,i)=><tr key={i}><td><select value={x.item_id} onChange={e=>{const it=items.find(a=>a.id===Number(e.target.value));setPurchaseItems(purchaseItems.map((z,j)=>j===i?{...z,item_id:e.target.value,rate:it?.purchase_rate||0}:z))}}><option value="">Select Item</option>{items.map(a=><option key={a.id} value={a.id}>{a.item_name}</option>)}</select></td><td><input type="number" step="0.01" value={x.rate} onChange={e=>setPurchaseItems(purchaseItems.map((z,j)=>j===i?{...z,rate:e.target.value}:z))}/></td><td><input type="number" min="1" value={x.qty} onChange={e=>setPurchaseItems(purchaseItems.map((z,j)=>j===i?{...z,qty:e.target.value}:z))}/></td><td>{money(Number(x.rate)*Number(x.qty))}</td><td><button type="button" className="icon-btn" onClick={()=>setPurchaseItems(purchaseItems.length>1?purchaseItems.filter((_,j)=>j!==i):purchaseItems)}>×</button></td></tr>)}</tbody></Table><div className="sale-bottom"><div className="total">Total <b>{money(purchaseTotal)}</b></div><div className="payment-box"><label>Payment Status<select value={purchasePayment} onChange={e=>setPurchasePayment(e.target.value)}><option value="PAID">Paid</option><option value="PARTIAL">Partially Paid</option><option value="DUE">Due</option></select></label>{purchasePayment==="PARTIAL"&&<label>Paid Amount<input type="number" value={purchasePaid} onChange={e=>setPurchasePaid(e.target.value)}/></label>}{purchasePayment!=="DUE"&&<label>Paid From Receiver<select value={purchaseReceiver} onChange={e=>setPurchaseReceiver(e.target.value)}><option value="">Select Receiver</option>{receivers.map(r=><option key={r.id} value={r.id}>{r.receiver_name}</option>)}</select></label>}<div>Balance Due: <b>{money(dueForPurchase)}</b></div></div></div><div className="form-actions"><button className="btn primary">Save Purchase</button></div></form></>}

  function Master(){return <><Header title="Master Data"/><div className="master-grid"><MasterCard title="Customer Master" count={customers.length} button="＋ Add Customer" onClick={()=>{setEditingCustomer(null);setCustomerForm(emptyCustomer);setShowCustomerForm(true)}}/><MasterCard title="Item Master" count={items.length} button="＋ Add Item" onClick={()=>{setEditingItem(null);setItemForm(emptyItem);setShowItemForm(true)}}/><MasterCard title="Receiver Master" count={receivers.length} button="＋ Add Receiver" onClick={()=>{setEditingReceiver(null);setReceiverForm(emptyReceiver);setShowReceiverForm(true)}}/><MasterCard title="Supplier Master" count={suppliers.length} button="＋ Add Supplier" onClick={()=>{setEditingSupplier(null);setSupplierForm(emptySupplier);setShowSupplierForm(true)}}/></div><div className="panel"><h3>Customers</h3><Table><thead><tr><th>Name</th><th>Mobile</th><th>Opening Due</th><th>Action</th></tr></thead><tbody>{customers.slice(0,10).map(c=><tr key={c.id}><td>{c.customer_name}</td><td>{c.mobile_no||"-"}</td><td>{money(c.opening_due)}</td><td><button className="text-btn" onClick={()=>{setEditingCustomer(c.id);setCustomerForm({customer_name:c.customer_name,mobile_no:c.mobile_no||"",address:c.address||"",opening_due:c.opening_due});setShowCustomerForm(true)}}>Edit</button></td></tr>)}{!customers.length&&<Empty col="4" text="No customers yet."/ >}</tbody></Table></div>{showCustomerForm&&<CustomerForm/>}{showItemForm&&<ItemForm/>}{showReceiverForm&&<ReceiverForm/>}{showSupplierForm&&<SupplierForm/>}</>}
  function MasterCard({title,count,button,onClick}){return <div className="master-card"><h3>{title}</h3><strong>{count}</strong><span>Records</span><button className="btn primary" onClick={onClick}>{button}</button></div>}

  function Reports(){const dueRows=sales.filter(s=>Number(s.due_amount)>0);return <><Header title="Reports"/><div className="report-grid"><div className="report-card"><h3>Invoice Report</h3><p>{sales.length} invoices · {money(dashboardSales)}</p></div><div className="report-card"><h3>Stock Report</h3><p>{items.length} items · {dashboardStock} units</p></div><div className="report-card"><h3>Collection Report</h3><p>{collections.length} collections · {money(dashboardCollections)}</p></div><div className="report-card"><h3>Due Report</h3><p>{dueRows.length} invoices · {money(dueRows.reduce((a,x)=>a+Number(x.due_amount),0))}</p></div></div><div className="panel"><h3>Due Report</h3><Table><thead><tr><th>Invoice</th><th>Customer</th><th>Date</th><th>Amount</th><th>Due</th><th>Age</th></tr></thead><tbody>{dueRows.map(s=>{const age=Math.max(0,Math.floor((Date.now()-new Date(s.invoice_date))/86400000));return <tr key={s.id}><td>{s.invoice_no}</td><td>{s.customers?.customer_name}</td><td>{s.invoice_date}</td><td>{money(s.total_amount)}</td><td>{money(s.due_amount)}</td><td>{age} days</td></tr>})}{!dueRows.length&&<Empty col="6" text="No dues."/ >}</tbody></Table></div></>}

  if (loading) return <div className="loading">Loading B Reddy Sales…</div>;
  return <div className="app"><Sidebar/><main className="main">{notice&&<div className="notice">{notice}</div>}{screen==="dashboard"&&<Dashboard/>}{screen==="create-sale"&&<CreateSale/>}{screen==="sales"&&<Sales/>}{screen==="customers"&&<Customers/>}{screen==="customer-detail"&&<CustomerDetail/>}{screen==="invoice-detail"&&<InvoiceDetail/>}{screen==="collections"&&<Collections/>}{screen==="payment"&&<Payment/>}{screen==="stock"&&<Stock/>}{screen==="procurement"&&<Procurement/>}{screen==="purchase"&&<Purchase/>}{screen==="reports"&&<Reports/>}{screen==="master"&&<Master/>}</main></div>;
}
