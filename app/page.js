 "use client";

import { Children, cloneElement, isValidElement, useEffect, useMemo, useState } from "react";
import { db } from "../lib/apiClient";
import { jsPDF } from "jspdf";

const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN", {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
const today = () => new Date().toISOString().slice(0, 10);
const displayDate = (value) => {
  if (!value) return "-";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", {day:"2-digit", month:"short", year:"numeric"});
};
const inPeriod = (date, period, asOn) => {
  if(!date) return false;
  const end=new Date((asOn||today())+"T23:59:59"), d=new Date(date+"T00:00:00");
  if(d>end) return false;
  if(period==="day") return date===asOn;
  if(period==="week"){ const start=new Date(end); start.setDate(end.getDate()-end.getDay()); start.setHours(0,0,0,0); return d>=start; }
  return d.getFullYear()===end.getFullYear() && d.getMonth()===end.getMonth();
};

const emptyCustomer = { customer_name: "", mobile_no: "", address: "", opening_due: 0 };
const emptyItem = { master_name: "", item_name: "", sale_rate: 0, purchase_rate: 0, opening_stock: 0, minimum_stock: 0 };
const emptyReceiver = { receiver_name: "", receiver_type: "Cash", opening_balance: 0, current_balance: 0 };
const emptySupplier = { supplier_name: "", mobile_no: "", address: "", opening_due: 0 };
const emptyExpense = { expense_date: today(), expense_type_id: "", amount: 0, paid_by: "Business", receiver_id: "", payment_mode: "CASH", reference_type: "", reference_id: "", remarks: "" };

function LoginScreen({
  loginRole,
  setLoginRole,
  notice,
  loginForm,
  setLoginForm,
  handleLogin,
  loginBusy,
}) {
  return <div className="auth-screen">
    <div className="auth-card">
      <div className="brand auth-brand">B REDDY SALES<span>Secure Login</span></div>
      <div className="login-tabs">
        <button type="button" className={loginRole==="admin"?"login-tab active": "login-tab"} onClick={()=>setLoginRole("admin")}>🔐 Admin Login</button>
        <button type="button" className={loginRole==="receiver"?"login-tab active": "login-tab"} onClick={()=>setLoginRole("receiver")}>💰 Receiver Login</button>
      </div>
      {notice&&<div className="notice">{notice}</div>}
      <form className="login-form" onSubmit={handleLogin}>
        <label>Email Address<input type="email" autoComplete="username" value={loginForm.email} onChange={e=>setLoginForm(v=>({...v,email:e.target.value}))} placeholder="Enter login email"/></label>
        <label>Password<input type="password" autoComplete="current-password" value={loginForm.password} onChange={e=>setLoginForm(v=>({...v,password:e.target.value}))} placeholder="Enter password"/></label>
        <button className="btn primary login-submit" disabled={loginBusy}>{loginBusy?"Signing in…":`Sign in as ${loginRole==="admin"?"Admin":"Receiver"}`}</button>
      </form>
      <small className="login-help">Login is managed securely by B Reddy Sales. Passwords are stored as secure hashes and sessions are protected by the server.</small>
    </div>
  </div>
}


export default function Home() {
  const [screen, setScreen] = useState("dashboard");
  const [sessionUser, setSessionUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginRole, setLoginRole] = useState("admin");
  const [loginForm, setLoginForm] = useState({email:"",password:""});
  const [loginBusy, setLoginBusy] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);
  const [receivers, setReceivers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [sales, setSales] = useState([]);
  const [collections, setCollections] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [stockTxns, setStockTxns] = useState([]);
  const [expenseTypes, setExpenseTypes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [expenseForm, setExpenseForm] = useState(emptyExpense);
  const [editingExpense, setEditingExpense] = useState(null);
  const [expenseDateFrom, setExpenseDateFrom] = useState("");
  const [expenseDateTo, setExpenseDateTo] = useState("");
  const [expenseTypeFilter, setExpenseTypeFilter] = useState("");
  const [expensePaidByFilter, setExpensePaidByFilter] = useState("");
  const [expenseReceiverFilter, setExpenseReceiverFilter] = useState("");
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [purchaseTransport, setPurchaseTransport] = useState(0);
  const [purchaseLoading, setPurchaseLoading] = useState(0);
  const [purchaseUnloading, setPurchaseUnloading] = useState(0);
  const [purchaseChargesPaidBy, setPurchaseChargesPaidBy] = useState("Business");
  const [purchaseChargesReceiver, setPurchaseChargesReceiver] = useState("");
  const [purchasePaymentId, setPurchasePaymentId] = useState(null);
  const [purchasePaymentAmount, setPurchasePaymentAmount] = useState("");
  const [purchasePaymentDate, setPurchasePaymentDate] = useState(today());
  const [purchasePaymentReceiver, setPurchasePaymentReceiver] = useState("");
  const [purchasePaymentNote, setPurchasePaymentNote] = useState("");
  const [purchasePaymentMode, setPurchasePaymentMode] = useState("CASH");
  const [salesDashboardPeriod, setSalesDashboardPeriod] = useState("day");
  const [collectionsDashboardPeriod, setCollectionsDashboardPeriod] = useState("day");
  const [dueDashboardPeriod, setDueDashboardPeriod] = useState("month");
  const [dashboardPeriod, setDashboardPeriod] = useState("month");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [userProfiles, setUserProfiles] = useState([]);
  const [expenseSearch, setExpenseSearch] = useState("");
  const [expensePaymentModeFilter, setExpensePaymentModeFilter] = useState("");
  const [paymentPurchaseSearch, setPaymentPurchaseSearch] = useState("");
  const [dashboardAsOnDate, setDashboardAsOnDate] = useState(today());
  const [salesAsOnDate, setSalesAsOnDate] = useState(today());
  const [collectionsAsOnDate, setCollectionsAsOnDate] = useState(today());
  const [stockAsOnDate, setStockAsOnDate] = useState(today());
  const [procurementAsOnDate, setProcurementAsOnDate] = useState(today());
  const [expenseTypeForm, setExpenseTypeForm] = useState({type_name:"",description:""});
  const [editingExpenseType, setEditingExpenseType] = useState(null);
  const [showExpenseTypeForm, setShowExpenseTypeForm] = useState(false);
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
  const [saleCustomerSearch, setSaleCustomerSearch] = useState("");
  const [openCustomerPicker, setOpenCustomerPicker] = useState(false);
  const [openItemPicker, setOpenItemPicker] = useState(null);
  const [itemPickerSearch, setItemPickerSearch] = useState("");
  const [openCostPicker, setOpenCostPicker] = useState(null);
  const [saleItems, setSaleItems] = useState([{ item_id: "", rate: 0, cost_rate: 0, qty: 1 }]);
  const [salePayment, setSalePayment] = useState("DUE");
  const [salePaid, setSalePaid] = useState(0);
  const [saleReceiver, setSaleReceiver] = useState("");
  const [salePaymentMode, setSalePaymentMode] = useState("CASH");
  const [paymentCustomer, setPaymentCustomer] = useState("");
  const [paymentAmounts, setPaymentAmounts] = useState({});
  const [paymentReceiver, setPaymentReceiver] = useState("");
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [paymentDate, setPaymentDate] = useState(today());
  const [paymentNote, setPaymentNote] = useState("");
  const [paymentInvoiceId, setPaymentInvoiceId] = useState(null);
  const [paymentOldDue, setPaymentOldDue] = useState("");
  const [editingCollection, setEditingCollection] = useState(null);
  const [collectionDateFrom, setCollectionDateFrom] = useState("");
  const [collectionDateTo, setCollectionDateTo] = useState("");
  const [collectionSearch, setCollectionSearch] = useState("");
  const [collectionReceiverFilter, setCollectionReceiverFilter] = useState("");
  const [collectionForm, setCollectionForm] = useState({collection_date:today(),receiver_id:"",payment_mode:"CASH",total_amount:0,remarks:""});
  const [stockHistoryItem, setStockHistoryItem] = useState(null);
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [purchaseDate, setPurchaseDate] = useState(today());
  const [purchaseSupplier, setPurchaseSupplier] = useState("");
  const [purchaseItems, setPurchaseItems] = useState([{ item_id: "", rate: 0, qty: 1 }]);
  const [purchasePayment, setPurchasePayment] = useState("DUE");
  const [purchasePaid, setPurchasePaid] = useState(0);
  const [purchaseReceiver, setPurchaseReceiver] = useState("");
  const [masterTab, setMasterTab] = useState("customers");
  const [reportTab, setReportTab] = useState("invoices");
  const [reportDateFrom, setReportDateFrom] = useState("");
  const [reportDateTo, setReportDateTo] = useState(today());
  const [reportSearch, setReportSearch] = useState("");
  const [auditTarget, setAuditTarget] = useState(null);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoiceCustomerFilter, setInvoiceCustomerFilter] = useState("");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState("");
  const [invoiceDateFrom, setInvoiceDateFrom] = useState("");
  const [invoiceDateTo, setInvoiceDateTo] = useState("");
  const [customerDueFilter, setCustomerDueFilter] = useState("");
  const [procurementSearch, setProcurementSearch] = useState("");
  const [procurementSupplierFilter, setProcurementSupplierFilter] = useState("");
  const [procurementStatusFilter, setProcurementStatusFilter] = useState("");
  const [procurementDateFrom, setProcurementDateFrom] = useState("");
  const [procurementDateTo, setProcurementDateTo] = useState("");

  useEffect(() => {
    if(typeof window!=="undefined"){
      const initial=window.location.hash.replace("#","");
      if(initial) setScreen(initial);
      else window.history.replaceState({screen:"dashboard"},"","#dashboard");
      const onPop=()=>setScreen(window.location.hash.replace("#","")||"dashboard");
      window.addEventListener("popstate",onPop);
      return ()=>window.removeEventListener("popstate",onPop);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me", { credentials: "include" })
      .then(async r => ({ ok: r.ok, json: await r.json() }))
      .then(({ ok, json }) => {
        if (!active) return;
        if (ok && json.user) {
          setSessionUser(json.user);
          setProfile(json.user);
        }
        setAuthLoading(false);
      })
      .catch(() => { if (active) setAuthLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!sessionUser || !profile) return;
    loadAll();
    // No automatic polling. Refresh data only after user actions or navigation.
    return undefined;
  }, [sessionUser?.id, profile?.role]);

  async function loadUserProfile() {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.user) {
      setSessionUser(null); setProfile(null); setAuthLoading(false);
      return null;
    }
    setSessionUser(json.user); setProfile(json.user); setAuthLoading(false);
    return json.user;
  }

  async function handleLogin(e){
    e.preventDefault();
    if(!loginForm.email.trim() || !loginForm.password) return setNotice("Enter email and password.");
    setLoginBusy(true); setNotice("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST", headers: {"Content-Type":"application/json"}, credentials: "include",
        body: JSON.stringify({ email: loginForm.email.trim(), password: loginForm.password, role: loginRole })
      });
      const json = await res.json().catch(() => ({}));
      if(!res.ok) { setLoginBusy(false); return setNotice(json.error || "Login failed."); }
      setProfile(json.user); setSessionUser(json.user); setLoginBusy(false); setScreen("dashboard");
      window.history.replaceState({screen:"dashboard"},"","#dashboard");
    } catch(err) {
      setLoginBusy(false); setNotice(err.message || "Login failed.");
    }
  }

  async function logout(){
    await fetch("/api/auth/logout", { method:"POST", credentials:"include" });
    setSessionUser(null); setProfile(null); setScreen("dashboard");
  }

  async function loadAll() {
    setLoading(true);
    try {
      const queries = await Promise.all([
        db.from("customers").select("*").eq("status", true).order("customer_name"),
        db.from("item_master").select("*").eq("status", true).order("item_name"),
        db.from("receivers").select("*").eq("status", true).order("receiver_name"),
        db.from("suppliers").select("*").eq("status", true).order("supplier_name"),
        db.from("sales").select("*, customers(customer_name, mobile_no), sale_items(*, item_master(item_name, master_name))").order("invoice_date", { ascending: false }),
        db.from("collections").select("*, customers(customer_name), receivers(receiver_name), collection_allocations(*, sales(invoice_no))").order("collection_date", { ascending: false }),
        db.from("purchases").select("*, suppliers(supplier_name), purchase_items(*, item_master(item_name))").order("purchase_date", { ascending: false }),
        db.from("stock_transactions").select("*, item_master(item_name, master_name)").order("transaction_date", { ascending: true }),
        db.from("expense_types").select("*").eq("status", true).order("type_name"),
        db.from("expenses").select("*, expense_types(type_name), receivers(receiver_name)").order("expense_date", { ascending: false }),
        db.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(500),
        profile?.role === "admin" ? db.from("user_profiles").select("*, receivers(receiver_name)").order("full_name") : Promise.resolve({data:[],error:null})
      ]);
      const [c,i,r,s,sa,co,pu,st,et,ex,au,up] = queries;
      const firstError = [c,i,r,s,sa,co,pu,st,et,ex,au].find(x => x.error);
      if (firstError) setNotice(firstError.error.message);
      setCustomers(c.data || []); setItems(i.data || []); setReceivers(r.data || []);
      setSuppliers(s.data || []); setSales(sa.data || []); setCollections(co.data || []);
      setPurchases(pu.data || []); setStockTxns(st.data || []);
      setExpenseTypes(et.data || []); setExpenses(ex.data || []); setAuditLogs(au.data || []); setUserProfiles(up?.data || []);
    } catch (err) {
      setNotice(err?.message || "Unable to load application data.");
    } finally {
      setLoading(false);
    }
  }

  function flash(msg) { setNotice(msg); setTimeout(() => setNotice(""), 3500); }
  function go(id) {
    setScreen(id);
    if(typeof window!=="undefined"){
      window.history.pushState({screen:id},"",`#${id}`);
      window.scrollTo({top:0, behavior:"smooth"});
    }
  }

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
  const purchaseItemsTotal = purchaseItems.reduce((a,x) => a + Number(x.rate || 0) * Number(x.qty || 0), 0);
  const purchaseChargesTotal = Number(purchaseTransport||0)+Number(purchaseLoading||0)+Number(purchaseUnloading||0);
  const purchaseTotal = purchaseItemsTotal;
  const paidForSale = salePayment === "PAID" ? saleTotal : salePayment === "PARTIAL" ? Math.min(Number(salePaid || 0), saleTotal) : 0;
  const dueForSale = saleTotal - paidForSale;
  const paidForPurchase = purchasePayment === "PAID" ? purchaseTotal : purchasePayment === "PARTIAL" ? Math.min(Number(purchasePaid || 0), purchaseTotal) : 0;
  const dueForPurchase = purchaseTotal - paidForPurchase;

  const inPeriod=(date,period,asOn)=>{
    if(!date) return false;
    const d=new Date(date+"T00:00:00"), end=new Date((asOn||today())+"T23:59:59");
    if(d>end) return false;
    if(period==="day") return date===asOn;
    if(period==="week"){ const start=new Date(end); start.setDate(end.getDate()-end.getDay()); start.setHours(0,0,0,0); return d>=start; }
    return d.getFullYear()===end.getFullYear() && d.getMonth()===end.getMonth();
  };
  const dashboardPeriodEnd=today();
  const periodSales=sales.filter(s=>inPeriod(s.invoice_date,dashboardPeriod,dashboardPeriodEnd));
  const periodCollections=collections.filter(c=>inPeriod(c.collection_date,dashboardPeriod,dashboardPeriodEnd));
  const periodDueSales=sales.filter(s=>inPeriod(s.invoice_date,dashboardPeriod,dashboardPeriodEnd));
  const periodSalesTotal=periodSales.reduce((a,x)=>a+Number(x.total_amount||0),0);
  const periodCollectionsTotal=periodCollections.reduce((a,x)=>a+Number(x.total_amount||0),0);
  const periodDueTotal=periodDueSales.reduce((a,x)=>a+Number(x.due_amount||0),0);
  const periodSalesCost=periodSales.reduce((total,sale)=>total+(sale.sale_items||[]).reduce((sum,line)=>{
    const item=items.find(i=>i.id===Number(line.item_id));
    const costRate=Number(line.cost_rate||0) || Number(item?.purchase_rate||0);
    return sum + Number(line.qty||0)*costRate;
  },0),0);
  const periodExpenses=expenses.filter(e=>inPeriod(e.expense_date,dashboardPeriod,dashboardPeriodEnd)).reduce((a,x)=>a+Number(x.amount||0),0);
  const periodGrossProfit=periodSalesTotal-periodSalesCost;
  const periodNetProfit=periodGrossProfit-periodExpenses;

  async function saveCustomer(e) {
    e.preventDefault();
    if (!customerForm.customer_name.trim()) return flash("Customer name is required.");
    const payload = {...customerForm, opening_due: Number(customerForm.opening_due || 0)};
    const q = editingCustomer
      ? db.from("customers").update(payload).eq("id", editingCustomer)
      : db.from("customers").insert(payload);
    const { error } = await q;
    if (error) return flash(error.message);
    setCustomerForm(emptyCustomer); setEditingCustomer(null); setShowCustomerForm(false);
    await loadAll(); flash("Customer saved.");
  }

  async function deleteCustomer(id) {
    if (!confirm("Delete this customer?")) return;
    const { error } = await db.from("customers").update({status:false}).eq("id", id);
    if (error) return flash(error.message);
    await loadAll(); flash("Customer deleted.");
  }

  async function saveItem(e) {
    e.preventDefault();
    if (!itemForm.item_name.trim()) return flash("Item name is required.");
    const payload = {...itemForm, sale_rate:Number(itemForm.sale_rate||0), purchase_rate:Number(itemForm.purchase_rate||0), opening_stock:Number(itemForm.opening_stock||0), minimum_stock:Number(itemForm.minimum_stock||0)};
    const q = editingItem ? db.from("item_master").update(payload).eq("id", editingItem) : db.from("item_master").insert(payload);
    const { error } = await q;
    if (error) return flash(error.message);
    setItemForm(emptyItem); setEditingItem(null); setShowItemForm(false); await loadAll(); flash("Item saved.");
  }

  async function deleteItem(id) {
    if (!confirm("Delete this item?")) return;
    const { error } = await db.from("item_master").update({status:false}).eq("id", id);
    if (error) return flash(error.message);
    await loadAll(); flash("Item deleted.");
  }

  async function saveReceiver(e) {
    e.preventDefault();
    if (!receiverForm.receiver_name.trim()) return flash("Receiver name is required.");
    const payload = {...receiverForm, opening_balance:Number(receiverForm.opening_balance||0), current_balance:Number(receiverForm.current_balance || receiverForm.opening_balance || 0)};
    const q = editingReceiver ? db.from("receivers").update(payload).eq("id", editingReceiver) : db.from("receivers").insert(payload);
    const { error } = await q;
    if (error) return flash(error.message);
    setReceiverForm(emptyReceiver); setEditingReceiver(null); setShowReceiverForm(false); await loadAll(); flash("Receiver saved.");
  }

  async function deleteReceiver(id) {
    if (!confirm("Delete this receiver?")) return;
    const { error } = await db.from("receivers").update({status:false}).eq("id", id);
    if (error) return flash(error.message);
    await loadAll(); flash("Receiver deleted.");
  }

  async function saveSupplier(e) {
    e.preventDefault();
    if (!supplierForm.supplier_name.trim()) return flash("Supplier name is required.");
    const payload = {...supplierForm, opening_due:Number(supplierForm.opening_due||0)};
    const q = editingSupplier ? db.from("suppliers").update(payload).eq("id", editingSupplier) : db.from("suppliers").insert(payload);
    const { error } = await q;
    if (error) return flash(error.message);
    setSupplierForm(emptySupplier); setEditingSupplier(null); setShowSupplierForm(false); await loadAll(); flash("Supplier saved.");
  }

  async function deleteSupplier(id) {
    if (!confirm("Delete this supplier?")) return;
    const { error } = await db.from("suppliers").update({status:false}).eq("id", id);
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

  const saleCustomerRecord = customers.find(x => x.id === Number(saleCustomer));
  const pickerCustomers = customers.filter(c =>
    `${c.customer_name} ${c.mobile_no || ""}`.toLowerCase().includes(saleCustomerSearch.toLowerCase())
  );
  const pickerItems = items.filter(it =>
    `${it.master_name || ""} ${it.item_name || ""}`.toLowerCase().includes(itemPickerSearch.toLowerCase())
  );

  function chooseSaleCustomer(c) {
    setSaleCustomer(String(c.id));
    setSaleCustomerSearch("");
    setOpenCustomerPicker(false);
  }

  function getPurchaseRateBatches(itemId, asOnDate=saleDate) {
    const id=Number(itemId);
    if(!id) return [];
    const purchased=[];
    purchases.filter(p=>p.purchase_date<=asOnDate).forEach(p=>{
      (p.purchase_items||[]).filter(pi=>Number(pi.item_id)===id && Number(pi.qty)>0).forEach(pi=>{
        purchased.push({purchase_id:p.id,purchase_no:p.purchase_no,purchase_date:p.purchase_date,rate:Number(pi.rate||0),qty:Number(pi.qty||0)});
      });
    });
    const soldByRate={};
    sales.filter(s=>s.invoice_date<=asOnDate).forEach(s=>{
      (s.sale_items||[]).filter(si=>Number(si.item_id)===id).forEach(si=>{
        const cost=Number(si.cost_rate||0);
        const fallback=Number(items.find(i=>i.id===id)?.purchase_rate||0);
        const key=cost>0?cost:fallback;
        soldByRate[key]=(soldByRate[key]||0)+Number(si.qty||0);
      });
    });
    const grouped={};
    purchased.forEach(b=>{
      const key=b.rate.toFixed(2);
      if(!grouped[key]) grouped[key]={rate:b.rate,qty:0,purchases:[]};
      grouped[key].qty+=b.qty; grouped[key].purchases.push(b);
    });
    const result=Object.values(grouped).map(b=>({
      ...b,
      available:Math.max(0,b.qty-Number(soldByRate[b.rate]||0)),
      label:b.purchases.map(x=>x.purchase_no).join(", ")
    })).filter(b=>b.available>0).sort((a,b)=>b.purchases[0].purchase_date.localeCompare(a.purchases[0].purchase_date));
    const item=items.find(i=>i.id===id);
    const purchasedTotal=result.reduce((a,b)=>a+b.available,0);
    const totalAvailable=Number(stockMap[id]||0);
    if(totalAvailable>purchasedTotal){
      const openingQty=totalAvailable-purchasedTotal;
      const openingRate=Number(item?.purchase_rate||0);
      if(openingQty>0) result.push({rate:openingRate,qty:openingQty,available:openingQty,purchases:[],label:"Opening / existing stock"});
    }
    return result;
  }

  function chooseSaleItem(index, it) {
    const batches=getPurchaseRateBatches(it.id,saleDate);
    const first=batches.find(b=>b.available>0);
    setSaleItems(prev=>prev.map((z,j)=>j===index?{...z,item_id:String(it.id),rate:Number(it.sale_rate||0),cost_rate:Number(first?.rate||it.purchase_rate||0),qty:Math.min(Number(z.qty||1),Number(first?.available||stockMap[it.id]||1))}:z));
    setOpenItemPicker(null);
    setOpenCostPicker(null);
    setItemPickerSearch("");
  }

  async function createSale(e) {
    e.preventDefault();
    if (!saleCustomer) return flash("Select a customer.");
    if (!saleItems.length || saleItems.some(x => !x.item_id || Number(x.qty) <= 0)) return flash("Select valid sale items.");
    for (const x of saleItems) {
      const batches=getPurchaseRateBatches(x.item_id,saleDate);
      const selected=batches.find(b=>Math.abs(Number(b.rate)-Number(x.cost_rate||0))<0.005);
      const available=selected?.available ?? Number(stockMap[x.item_id]||0);
      if(Number(x.qty)>available) return flash(`Insufficient stock at purchase rate ${money(x.cost_rate)} for ${items.find(i=>i.id===Number(x.item_id))?.item_name || "item"}. Available: ${available}.`);
      if(Number(x.cost_rate||0)<=0) return flash(`Select a valid purchase rate for ${items.find(i=>i.id===Number(x.item_id))?.item_name || "item"}.`);
    }
    const { data: inv, error: invErr } = await db.rpc("next_invoice_number");
    if (invErr) return flash("Run the supplied Supabase SQL first. Invoice number function is missing.");
    const { data: sale, error } = await db.from("sales").insert({
      invoice_no: inv, invoice_date:saleDate, customer_id:Number(saleCustomer),
      total_amount:saleTotal, paid_amount:paidForSale, due_amount:dueForSale,
      payment_status: salePayment
    }).select().single();
    if (error) return flash(error.message);
    const rows = saleItems.map(x => ({sale_id:sale.id, item_id:Number(x.item_id), rate:Number(x.rate), cost_rate:Number(x.cost_rate||0), qty:Number(x.qty), amount:Number(x.rate)*Number(x.qty)}));
    const { error:itemErr } = await db.from("sale_items").insert(rows);
    if (itemErr) return flash(itemErr.message);
    const stockRows = saleItems.map(x => ({transaction_date:saleDate, item_id:Number(x.item_id), transaction_type:"SALE", reference_id:sale.id, qty_in:0, qty_out:Number(x.qty), rate:Number(x.rate), cost_rate:Number(x.cost_rate||0)}));
    const { error:stockErr } = await db.from("stock_transactions").insert(stockRows);
    if (stockErr) return flash(stockErr.message);
    if (paidForSale > 0 && saleReceiver) {
      const collectionNo = `COL-${Date.now()}`;
      const {data:col,error:colErr}=await db.from("collections").insert({
        collection_no:collectionNo, collection_date:saleDate, customer_id:Number(saleCustomer),
        receiver_id:Number(saleReceiver), payment_mode:salePaymentMode, total_amount:paidForSale, remarks:`Payment for ${inv}`
      }).select().single();
      if(colErr) return flash(colErr.message);
      const {error:allocErr}=await db.from("collection_allocations").insert({
        collection_id:col.id, sale_id:sale.id, amount:paidForSale
      });
      if(allocErr) return flash(allocErr.message);
      await db.from("receivers").update({
        current_balance: Number(receivers.find(r=>r.id===Number(saleReceiver))?.current_balance||0)+paidForSale
      }).eq("id",Number(saleReceiver));
    }
    setSaleCustomer(""); setSaleItems([{item_id:"",rate:0,cost_rate:0,qty:1}]); setSalePayment("DUE"); setSalePaid(0); setSaleReceiver(""); setSalePaymentMode("CASH");
    await loadAll(); go("dashboard"); flash(`${inv} saved successfully.`);
  }

  async function makePayment(e) {
    e.preventDefault();
    if (!paymentCustomer || !paymentReceiver || !paymentMode) return flash("Select customer, receiver and payment mode.");

    const customer = customers.find(c=>c.id===Number(paymentCustomer));
    const oldDueAmount = Number(paymentOldDue || 0);
    const allocations = Object.entries(paymentAmounts)
      .filter(([,v]) => Number(v) > 0)
      .map(([saleId,v]) => [saleId, Number(v)]);

    const invoiceTotal = allocations.reduce((a,[,v])=>a+v,0);
    const total = invoiceTotal + oldDueAmount;
    if (oldDueAmount > Number(customer?.opening_due||0)) return flash("Old due collection cannot exceed the customer's old due.");
    if (!total) return flash("Enter a payment amount.");

    const receiver = receivers.find(x=>x.id===Number(paymentReceiver));
    const {data:col,error} = await db.from("collections").insert({
      collection_no:`COL-${Date.now()}`,
      collection_date:paymentDate,
      customer_id:Number(paymentCustomer),
      receiver_id:Number(paymentReceiver),
      payment_mode:paymentMode,
      total_amount:total,
      remarks:paymentNote || (allocations.length ? `Payment for ${allocations.map(([saleId])=>sales.find(s=>s.id===Number(saleId))?.invoice_no).filter(Boolean).join(", ")}` : "Collection against old due")
    }).select().single();
    if (error) return flash(error.message);

    if (allocations.length) {
      const rows = allocations.map(([saleId,v])=>({collection_id:col.id,sale_id:Number(saleId),amount:v}));
      const {error:aErr}=await db.from("collection_allocations").insert(rows);
      if (aErr) return flash(aErr.message);

      for (const [saleId,v] of allocations) {
        const sale=sales.find(x=>x.id===Number(saleId));
        if (!sale) continue;
        const newPaid=Math.min(Number(sale.total_amount),Number(sale.paid_amount||0)+v);
        const newDue=Math.max(0,Number(sale.total_amount)-newPaid);
        await db.from("sales").update({
          paid_amount:newPaid,
          due_amount:newDue,
          payment_status:newDue===0?"PAID":"PARTIAL"
        }).eq("id",sale.id);
      }
    }

    if (oldDueAmount > 0) {
      await db.from("customers")
        .update({opening_due:Math.max(0,Number(customer?.opening_due||0)-oldDueAmount)})
        .eq("id",Number(paymentCustomer));
    }

    await db.from("receivers")
      .update({current_balance:Number(receiver?.current_balance||0)+total})
      .eq("id",Number(paymentReceiver));

    setPaymentAmounts({});
    setPaymentOldDue("");
    setPaymentCustomer("");
    setPaymentReceiver("");
    setPaymentMode("CASH");
    setPaymentInvoiceId(null);
    setPaymentNote("");
    await loadAll();
    go("collections");
    flash("Collection recorded successfully.");
  }

  async function recordPurchasePayment(e){
    e.preventDefault();
    const pur=purchases.find(x=>x.id===Number(purchasePaymentId));
    const amount=Number(purchasePaymentAmount||0);
    if(!pur) return flash("Purchase not found.");
    if(amount<=0 || amount>Number(pur.due_amount||0)) return flash("Enter a valid payment amount.");
    if(!purchasePaymentReceiver) return flash("Select receiver.");
    const r=receivers.find(x=>x.id===Number(purchasePaymentReceiver));
    const newPaid=Number(pur.paid_amount||0)+amount, newDue=Math.max(0,Number(pur.total_amount)-newPaid);
    const {error}=await db.from("purchases").update({paid_amount:newPaid,due_amount:newDue,payment_status:newDue===0?"PAID":"PARTIAL",receiver_id:Number(purchasePaymentReceiver),payment_mode:purchasePaymentMode}).eq("id",pur.id);
    if(error) return flash(error.message);
    await db.from("receivers").update({current_balance:Number(r?.current_balance||0)-amount}).eq("id",Number(purchasePaymentReceiver));
    await db.from("audit_logs").insert({table_name:"purchases",record_id:pur.id,action:"PAYMENT",details:{amount,payment_date:purchasePaymentDate,remarks:purchasePaymentNote,receiver_id:Number(purchasePaymentReceiver)}}).catch(()=>{});
    setPurchasePaymentId(null);setPurchasePaymentAmount("");setPurchasePaymentReceiver("");setPurchasePaymentMode("CASH");setPurchasePaymentNote("");await loadAll();flash(`Payment recorded for ${pur.purchase_no}.`);
  }

  function PurchasePaymentModal(){
    const pur=purchases.find(x=>x.id===Number(purchasePaymentId));
    if(!pur) return null;
    return <div className="modal-backdrop"><div className="modal">
      <div className="modal-head"><div><h3>Purchase Payment</h3><small>{pur.purchase_no} · Balance {money(pur.due_amount)}</small></div><button type="button" onClick={()=>setPurchasePaymentId(null)}>×</button></div>
      <form className="grid-form" onSubmit={recordPurchasePayment}>
        <label>Payment Date<input type="date" value={purchasePaymentDate} onChange={e=>setPurchasePaymentDate(e.target.value)}/></label>
        <label>Amount<input type="number" min="0.01" max={pur.due_amount} step="0.01" value={purchasePaymentAmount} onChange={e=>setPurchasePaymentAmount(e.target.value)} placeholder="Enter payment"/></label>
        <label>Paid From Receiver<select value={purchasePaymentReceiver} onChange={e=>setPurchasePaymentReceiver(e.target.value)}><option value="">Select Receiver</option>{receivers.map(r=><option key={r.id} value={r.id}>{r.receiver_name} ({money(r.current_balance)})</option>)}</select></label>
        <label>Paid As<select value={purchasePaymentMode} onChange={e=>setPurchasePaymentMode(e.target.value)}><option value="CASH">Cash</option><option value="PHONEPE">PhonePe</option></select></label>
        <label className="full">Remarks<textarea value={purchasePaymentNote} onChange={e=>setPurchasePaymentNote(e.target.value)} placeholder={`Payment for ${pur.purchase_no}`}/></label>
        <div className="modal-actions"><button type="button" className="btn secondary" onClick={()=>setPurchasePaymentId(null)}>Cancel</button><button className="btn primary">Save Payment</button></div>
      </form>
    </div></div>
  }

  async function createPurchase(e) {
    e.preventDefault();
    if (!purchaseSupplier) return flash("Select supplier.");
    if (purchaseItems.some(x=>!x.item_id || Number(x.qty)<=0)) return flash("Select valid purchase items.");

    if (editingPurchase) {
      const old = purchases.find(x=>x.id===Number(editingPurchase));
      if (!old) return flash("Purchase record not found.");

      // Restore the old receiver balance before applying the edited payment.
      if (old.receiver_id && Number(old.paid_amount||0)) {
        const oldReceiver = receivers.find(r=>r.id===Number(old.receiver_id));
        await db.from("receivers").update({
          current_balance:Number(oldReceiver?.current_balance||0)+Number(old.paid_amount||0)
        }).eq("id",Number(old.receiver_id));
      }

      const {error:uErr}=await db.from("purchases").update({
        purchase_date:purchaseDate,
        supplier_id:Number(purchaseSupplier),
        total_amount:purchaseTotal,
        paid_amount:paidForPurchase,
        due_amount:dueForPurchase,
        payment_status:purchasePayment,
        receiver_id:purchaseReceiver?Number(purchaseReceiver):null,
        payment_mode:purchasePaymentMode,
        transportation_charge:Number(purchaseTransport||0),
        loading_charge:Number(purchaseLoading||0),
        unloading_charge:Number(purchaseUnloading||0),
        charges_paid_by:purchaseChargesPaidBy,
        charges_receiver_id:purchaseChargesPaidBy==="Business"&&purchaseChargesReceiver?Number(purchaseChargesReceiver):null
      }).eq("id",Number(editingPurchase));
      if (uErr) return flash(uErr.message);

      await db.from("purchase_items").delete().eq("purchase_id",Number(editingPurchase));
      await db.from("stock_transactions").delete().eq("reference_id",Number(editingPurchase)).eq("transaction_type","PURCHASE");

      const rows=purchaseItems.map(x=>({purchase_id:Number(editingPurchase),item_id:Number(x.item_id),rate:Number(x.rate),qty:Number(x.qty),amount:Number(x.rate)*Number(x.qty)}));
      const {error:piErr}=await db.from("purchase_items").insert(rows);
      if(piErr) return flash(piErr.message);

      const stockRows=purchaseItems.map(x=>({transaction_date:purchaseDate,item_id:Number(x.item_id),transaction_type:"PURCHASE",reference_id:Number(editingPurchase),qty_in:Number(x.qty),qty_out:0,rate:Number(x.rate)}));
      const {error:stErr}=await db.from("stock_transactions").insert(stockRows);
      if(stErr) return flash(stErr.message);

      if(paidForPurchase && purchaseReceiver){
        const r=receivers.find(x=>x.id===Number(purchaseReceiver));
        const baseBalance = Number(r?.current_balance||0) + (old.receiver_id && Number(old.receiver_id)===Number(purchaseReceiver) ? Number(old.paid_amount||0) : 0);
        await db.from("receivers").update({
          current_balance:baseBalance-paidForPurchase
        }).eq("id",Number(purchaseReceiver));
      }

      // Replace optional purchase expenses and restore any old business-paid receiver amounts.
      const oldExpenses=expenses.filter(x=>x.reference_type==="PURCHASE"&&Number(x.reference_id)===Number(editingPurchase));
      for(const ex of oldExpenses){
        if(ex.paid_by==="Business"&&ex.receiver_id){
          const rr=receivers.find(r=>r.id===Number(ex.receiver_id));
          if(rr) await db.from("receivers").update({current_balance:Number(rr.current_balance||0)+Number(ex.amount||0)}).eq("id",Number(rr.id));
        }
      }
      await db.from("expenses").delete().eq("reference_type","PURCHASE").eq("reference_id",Number(editingPurchase));
      const expenseRows=[];
      const typeMap={transport:"Transportation",loading:"Loading & Unloading",unloading:"Loading & Unloading"};
      if(Number(purchaseTransport)>0) expenseRows.push({expense_date:purchaseDate,expense_type_id:expenseTypes.find(x=>x.type_name===typeMap.transport)?.id,amount:Number(purchaseTransport),paid_by:purchaseChargesPaidBy,receiver_id:purchaseChargesPaidBy==="Business"&&purchaseChargesReceiver?Number(purchaseChargesReceiver):null,reference_type:"PURCHASE",reference_id:Number(editingPurchase),remarks:`Transportation charges for ${old.purchase_no}`});
      if(Number(purchaseLoading)>0) expenseRows.push({expense_date:purchaseDate,expense_type_id:expenseTypes.find(x=>x.type_name===typeMap.loading)?.id,amount:Number(purchaseLoading),paid_by:purchaseChargesPaidBy,receiver_id:purchaseChargesPaidBy==="Business"&&purchaseChargesReceiver?Number(purchaseChargesReceiver):null,reference_type:"PURCHASE",reference_id:Number(editingPurchase),remarks:`Loading charges for ${old.purchase_no}`});
      if(Number(purchaseUnloading)>0) expenseRows.push({expense_date:purchaseDate,expense_type_id:expenseTypes.find(x=>x.type_name===typeMap.unloading)?.id,amount:Number(purchaseUnloading),paid_by:purchaseChargesPaidBy,receiver_id:purchaseChargesPaidBy==="Business"&&purchaseChargesReceiver?Number(purchaseChargesReceiver):null,reference_type:"PURCHASE",reference_id:Number(editingPurchase),remarks:`Unloading charges for ${old.purchase_no}`});
      if(expenseRows.length){
        await db.from("expenses").insert(expenseRows.filter(x=>x.expense_type_id));
        if(purchaseChargesPaidBy==="Business"&&purchaseChargesReceiver){
          const rr=receivers.find(r=>r.id===Number(purchaseChargesReceiver));
          if(rr) await db.from("receivers").update({current_balance:Number(rr.current_balance||0)-purchaseChargesTotal}).eq("id",Number(rr.id));
        }
      }

      setEditingPurchase(null);
      setPurchaseSupplier("");setPurchaseItems([{item_id:"",rate:0,qty:1}]);setPurchasePayment("DUE");setPurchasePaid(0);setPurchaseReceiver("");setPurchasePaymentMode("CASH");setPurchaseTransport(0);setPurchaseLoading(0);setPurchaseUnloading(0);setPurchaseChargesPaidBy("Business");setPurchaseChargesReceiver("");
      await loadAll();go("procurement");flash(`${old.purchase_no} updated successfully.`);
      return;
    }

    const {data:no,error:noErr}=await db.rpc("next_purchase_number");
    if (noErr) return flash("Run the supplied Supabase SQL first. Purchase number function is missing.");
    const {data:pur,error}=await db.from("purchases").insert({
      purchase_no:no,purchase_date:purchaseDate,supplier_id:Number(purchaseSupplier),
      total_amount:purchaseTotal,paid_amount:paidForPurchase,due_amount:dueForPurchase,
      payment_status:purchasePayment,receiver_id:purchaseReceiver?Number(purchaseReceiver):null,
      payment_mode:purchasePaymentMode,
      transportation_charge:Number(purchaseTransport||0),
      loading_charge:Number(purchaseLoading||0),
      unloading_charge:Number(purchaseUnloading||0),
      charges_paid_by:purchaseChargesPaidBy,
      charges_receiver_id:purchaseChargesPaidBy==="Business"&&purchaseChargesReceiver?Number(purchaseChargesReceiver):null
    }).select().single();
    if (error) return flash(error.message);
    const rows=purchaseItems.map(x=>({purchase_id:pur.id,item_id:Number(x.item_id),rate:Number(x.rate),qty:Number(x.qty),amount:Number(x.rate)*Number(x.qty)}));
    const {error:piErr}=await db.from("purchase_items").insert(rows);
    if(piErr) return flash(piErr.message);
    const stockRows=purchaseItems.map(x=>({transaction_date:purchaseDate,item_id:Number(x.item_id),transaction_type:"PURCHASE",reference_id:pur.id,qty_in:Number(x.qty),qty_out:0,rate:Number(x.rate)}));
    const {error:stErr}=await db.from("stock_transactions").insert(stockRows);
    if(stErr) return flash(stErr.message);
    if(paidForPurchase && purchaseReceiver){
      const r=receivers.find(x=>x.id===Number(purchaseReceiver));
      await db.from("receivers").update({current_balance:Number(r?.current_balance||0)-paidForPurchase}).eq("id",Number(purchaseReceiver));
    }
    const expenseRows=[];
    const transportType=expenseTypes.find(x=>x.type_name==="Transportation");
    const loadingType=expenseTypes.find(x=>x.type_name==="Loading & Unloading");
    if(Number(purchaseTransport)>0&&transportType) expenseRows.push({expense_date:purchaseDate,expense_type_id:transportType.id,amount:Number(purchaseTransport),paid_by:purchaseChargesPaidBy,receiver_id:purchaseChargesPaidBy==="Business"&&purchaseChargesReceiver?Number(purchaseChargesReceiver):null,reference_type:"PURCHASE",reference_id:pur.id,remarks:`Transportation charges for ${no}`});
    if(Number(purchaseLoading)>0&&loadingType) expenseRows.push({expense_date:purchaseDate,expense_type_id:loadingType.id,amount:Number(purchaseLoading),paid_by:purchaseChargesPaidBy,receiver_id:purchaseChargesPaidBy==="Business"&&purchaseChargesReceiver?Number(purchaseChargesReceiver):null,reference_type:"PURCHASE",reference_id:pur.id,remarks:`Loading charges for ${no}`});
    if(Number(purchaseUnloading)>0&&loadingType) expenseRows.push({expense_date:purchaseDate,expense_type_id:loadingType.id,amount:Number(purchaseUnloading),paid_by:purchaseChargesPaidBy,receiver_id:purchaseChargesPaidBy==="Business"&&purchaseChargesReceiver?Number(purchaseChargesReceiver):null,reference_type:"PURCHASE",reference_id:pur.id,remarks:`Unloading charges for ${no}`});
    if(expenseRows.length){
      await db.from("expenses").insert(expenseRows);
      if(purchaseChargesPaidBy==="Business"&&purchaseChargesReceiver){
        const rr=receivers.find(r=>r.id===Number(purchaseChargesReceiver));
        if(rr) await db.from("receivers").update({current_balance:Number(rr.current_balance||0)-purchaseChargesTotal}).eq("id",Number(rr.id));
      }
    }
    setPurchaseSupplier("");setPurchaseItems([{item_id:"",rate:0,qty:1}]);setPurchasePayment("DUE");setPurchasePaid(0);setPurchaseReceiver("");setPurchasePaymentMode("CASH");setPurchaseTransport(0);setPurchaseLoading(0);setPurchaseUnloading(0);setPurchaseChargesPaidBy("Business");setPurchaseChargesReceiver("");
    await loadAll();go("procurement");flash(`${no} saved successfully.`);
  }

  const filteredCustomers=customers.filter(c=>{
    const text=(c.customer_name+" "+(c.mobile_no||"")).toLowerCase();
    const matchesSearch=text.includes(customerSearch.toLowerCase());
    const due=customerDue(c.id);
    const matchesDue=!customerDueFilter || (customerDueFilter==="due" ? due>0 : due<=0);
    return matchesSearch && matchesDue;
  });
  const filteredItems=items.filter(i=>(i.item_name+" "+(i.master_name||"")).toLowerCase().includes(itemSearch.toLowerCase()));

  async function saveExpense(e){
    e.preventDefault();
    if(!expenseForm.expense_type_id) return flash("Select expense type.");
    if(Number(expenseForm.amount)<=0) return flash("Enter expense amount.");
    if(expenseForm.paid_by==="Business"&&!expenseForm.receiver_id) return flash("Select receiver for a business-paid expense.");
    const payload={
      expense_date:expenseForm.expense_date, expense_type_id:Number(expenseForm.expense_type_id),
      amount:Number(expenseForm.amount), paid_by:expenseForm.paid_by,
      receiver_id:expenseForm.paid_by==="Business"&&expenseForm.receiver_id?Number(expenseForm.receiver_id):null,
      payment_mode:expenseForm.paid_by==="Business" ? (expenseForm.payment_mode||"CASH") : "CASH",
      reference_type:expenseForm.reference_type||null, reference_id:expenseForm.reference_id?Number(expenseForm.reference_id):null,
      remarks:expenseForm.remarks||null
    };
    if(editingExpense){
      const old=expenses.find(x=>x.id===Number(editingExpense));
      if(old?.paid_by==="Business"&&old.receiver_id){
        const r=receivers.find(x=>x.id===Number(old.receiver_id));
        if(r) await db.from("receivers").update({current_balance:Number(r.current_balance||0)+Number(old.amount||0)}).eq("id",Number(old.receiver_id));
      }
      const {error}=await db.from("expenses").update(payload).eq("id",Number(editingExpense));
      if(error) return flash(error.message);
    }else{
      const {error}=await db.from("expenses").insert(payload);
      if(error) return flash(error.message);
    }
    if(payload.paid_by==="Business"&&payload.receiver_id){
      const r=receivers.find(x=>x.id===Number(payload.receiver_id));
      const base=Number(r?.current_balance||0);
      const old=editingExpense?expenses.find(x=>x.id===Number(editingExpense)):null;
      const same=old?.paid_by==="Business"&&Number(old.receiver_id)===Number(payload.receiver_id);
      await db.from("receivers").update({current_balance:(same?base+Number(old.amount||0):base)-Number(payload.amount)}).eq("id",Number(payload.receiver_id));
    }
    setShowExpenseForm(false);setEditingExpense(null);setExpenseForm({...emptyExpense});await loadAll();flash(editingExpense?"Expense updated successfully.":"Expense saved successfully.");
  }

  async function saveExpenseType(e){
    e.preventDefault();
    if(!expenseTypeForm.type_name.trim()) return flash("Expense type name is required.");
    const payload={type_name:expenseTypeForm.type_name.trim(),description:expenseTypeForm.description||""};
    const q=editingExpenseType
      ? db.from("expense_types").update(payload).eq("id",Number(editingExpenseType))
      : db.from("expense_types").insert(payload);
    const {error}=await q;
    if(error) return flash(error.message);
    setShowExpenseTypeForm(false);setEditingExpenseType(null);setExpenseTypeForm({type_name:"",description:""});await loadAll();flash("Expense type saved.");
  }

  function ExpenseTypeForm(){
    return <div className="modal-backdrop"><div className="modal">
      <div className="modal-head"><h3>{editingExpenseType?"Edit Expense Type":"Add Expense Type"}</h3><button type="button" onClick={()=>setShowExpenseTypeForm(false)}>×</button></div>
      <form className="grid-form" onSubmit={saveExpenseType}>
        <label>Expense Type*<input value={expenseTypeForm.type_name} onChange={e=>setExpenseTypeForm(v=>({...v,type_name:e.target.value}))}/></label>
        <label>Description<input value={expenseTypeForm.description} onChange={e=>setExpenseTypeForm(v=>({...v,description:e.target.value}))}/></label>
        <div className="modal-actions"><button type="button" className="btn secondary" onClick={()=>setShowExpenseTypeForm(false)}>Cancel</button><button className="btn primary">Save</button></div>
      </form>
    </div></div>
  }

  function ExpenseForm(){
    return <div className="modal-backdrop"><div className="modal">
      <div className="modal-head"><h3>{editingExpense?"Edit Expense":"Add Expense"}</h3><button type="button" onClick={()=>setShowExpenseForm(false)}>×</button></div>
      <form className="grid-form" onSubmit={saveExpense}>
        <label>Date<input type="date" value={expenseForm.expense_date} onChange={e=>setExpenseForm(v=>({...v,expense_date:e.target.value}))}/></label>
        <label>Expense Type*<select value={expenseForm.expense_type_id} onChange={e=>setExpenseForm(v=>({...v,expense_type_id:e.target.value}))}><option value="">Select Expense Type</option>{expenseTypes.map(t=><option key={t.id} value={t.id}>{t.type_name}</option>)}</select></label>
        <label>Amount<input type="number" min="0.01" step="0.01" value={expenseForm.amount} onChange={e=>setExpenseForm(v=>({...v,amount:e.target.value}))}/></label>
        <label>Paid By<select value={expenseForm.paid_by} onChange={e=>setExpenseForm(v=>({...v,paid_by:e.target.value,receiver_id:""}))}><option>Business</option><option>Supplier</option></select></label>
        {expenseForm.paid_by==="Business"&&<><label>Paid From Receiver<select value={expenseForm.receiver_id} onChange={e=>setExpenseForm(v=>({...v,receiver_id:e.target.value}))}><option value="">Select Receiver</option>{receivers.map(r=><option key={r.id} value={r.id}>{r.receiver_name}</option>)}</select></label><label>Paid As<select value={expenseForm.payment_mode} onChange={e=>setExpenseForm(v=>({...v,payment_mode:e.target.value}))}><option value="CASH">Cash</option><option value="PHONEPE">PhonePe</option></select></label></>}
        <label>Reference Type<select value={expenseForm.reference_type} onChange={e=>setExpenseForm(v=>({...v,reference_type:e.target.value}))}><option value="">None</option><option value="PURCHASE">Purchase</option><option value="OTHER">Other</option></select></label>
        {expenseForm.reference_type==="PURCHASE"&&<label>Purchase<select value={expenseForm.reference_id} onChange={e=>setExpenseForm(v=>({...v,reference_id:e.target.value}))}><option value="">Select Purchase</option>{purchases.map(x=><option key={x.id} value={x.id}>{x.purchase_no} - {x.suppliers?.supplier_name||"Supplier"} - {displayDate(x.purchase_date)}</option>)}</select></label>}
        <label className="full">Remarks<textarea value={expenseForm.remarks} onChange={e=>setExpenseForm(v=>({...v,remarks:e.target.value}))}/></label>
        <div className="modal-actions"><button type="button" className="btn secondary" onClick={()=>setShowExpenseForm(false)}>Cancel</button><button className="btn primary">Save Expense</button></div>
      </form>
    </div></div>
  }

  function Expenses(){
    const q=String(expenseSearch||"").trim().toLowerCase();
    const uniqueExpenses=Array.from(new Map(expenses.map(x=>[`${x.expense_date}|${x.expense_type_id}|${Number(x.amount||0).toFixed(2)}|${x.paid_by||""}|${x.receiver_id||""}|${x.payment_mode||""}|${x.reference_type||""}|${x.reference_id||""}|${x.remarks||""}`,x])).values());
    const filtered=uniqueExpenses.filter(x=>{
      const hay=`${x.remarks||""} ${x.reference_type||""} ${x.reference_id||""} ${x.expense_types?.type_name||""} ${x.receivers?.receiver_name||""}`.toLowerCase();
      return (!q||hay.includes(q))&&(!expenseDateFrom||x.expense_date>=expenseDateFrom)&&(!expenseDateTo||x.expense_date<=expenseDateTo)&&(!expenseTypeFilter||x.expense_type_id===Number(expenseTypeFilter))&&(!expensePaidByFilter||x.paid_by===expensePaidByFilter)&&(!expenseReceiverFilter||x.receiver_id===Number(expenseReceiverFilter));
    });
    function clearFilters(){setExpenseSearch("");setExpenseDateFrom("");setExpenseDateTo("");setExpenseTypeFilter("");setExpensePaidByFilter("");setExpenseReceiverFilter("");setExpensePaymentModeFilter("");}
    function openEdit(x){setEditingExpense(x.id);setExpenseForm({expense_date:x.expense_date,expense_type_id:String(x.expense_type_id),amount:x.amount,paid_by:x.paid_by,receiver_id:x.receiver_id?String(x.receiver_id):"",payment_mode:x.payment_mode||"CASH",reference_type:x.reference_type||"",reference_id:x.reference_id?String(x.reference_id):"",remarks:x.remarks||""});setShowExpenseForm(true);}
    return <><Header title="Expenses"><button className="btn primary" onClick={()=>{setEditingExpense(null);setExpenseForm({...emptyExpense,expense_date:today()});setShowExpenseForm(true)}}>＋ Add Expense</button></Header>
      <div className="panel expense-filter-panel">
        <div className="filter-title"><div><b>Expense Filters</b><small>Search, date, type, payment and receiver</small></div><span>{filtered.length} records</span></div>
        <div className="filter-grid expense-filter-grid">
          <label className="filter-search">Search<input placeholder="Expense type / remarks / reference / receiver" value={expenseSearch} onChange={e=>setExpenseSearch(e.target.value)}/></label>
          <label>From Date<input type="date" value={expenseDateFrom} onChange={e=>setExpenseDateFrom(e.target.value)}/></label>
          <label>To Date<input type="date" value={expenseDateTo} onChange={e=>setExpenseDateTo(e.target.value)}/></label>
          <label>Expense Type<select value={expenseTypeFilter} onChange={e=>setExpenseTypeFilter(e.target.value)}><option value="">All Types</option>{expenseTypes.map(t=><option key={t.id} value={t.id}>{t.type_name}</option>)}</select></label>
          <label>Paid By<select value={expensePaidByFilter} onChange={e=>setExpensePaidByFilter(e.target.value)}><option value="">All</option><option>Business</option><option>Supplier</option></select></label>
          <label>Receiver<select value={expenseReceiverFilter} onChange={e=>setExpenseReceiverFilter(e.target.value)}><option value="">All Receivers</option>{receivers.map(r=><option key={r.id} value={r.id}>{r.receiver_name}</option>)}</select></label>
          <button type="button" className="btn secondary filter-clear" onClick={clearFilters}>Clear All</button>
        </div>
      </div>
      <div className="panel"><div className="panel-title-row"><div><h3>Expense Register</h3><small>Total: {money(filtered.reduce((a,x)=>a+Number(x.amount||0),0))}</small></div></div><Table><thead><tr><th>Date</th><th>Expense Type</th><th>Amount</th><th>Paid By</th><th>Receiver</th><th>Paid As</th><th>Reference</th><th>Remarks</th><th>Action</th></tr></thead><tbody>{filtered.map(x=><tr key={x.id}><td>{x.expense_date}</td><td>{x.expense_types?.type_name}</td><td>{money(x.amount)}</td><td>{x.paid_by}</td><td>{x.receivers?.receiver_name||"-"}</td><td>{x.payment_mode==="PHONEPE"?"PhonePe":"Cash"}</td><td className={x.reference_type==="PURCHASE"?"link":""}>{x.reference_type?`${x.reference_type} #${x.reference_id}`:"-"}</td><td>{x.remarks||"-"}</td><td><button type="button" className="small-btn secondary" onClick={()=>setAuditTarget({table:"expenses",id:x.id,label:`Expense #${x.id}`})}>Audit</button><button type="button" className="small-btn secondary" onClick={()=>openEdit(x)}>Edit</button></td></tr>)}{!filtered.length&&<Empty col="9" text="No expenses found."/>}</tbody></Table></div>
      {showExpenseForm&&ExpenseForm()}
    </>
  }

  function CustomerForm() {
    return <div className="modal-backdrop"><div className="modal">
      <div className="modal-head"><h3>{editingCustomer?"Edit Customer":"Add Customer"}</h3><button type="button" onClick={()=>{setShowCustomerForm(false);setEditingCustomer(null);setCustomerForm({...emptyCustomer})}}>×</button></div>
      <form onSubmit={saveCustomer} className="grid-form">
        <label>Customer Name*<input value={customerForm.customer_name} onChange={e=>setCustomerForm(prev=>({...prev,customer_name:e.target.value}))}/></label>
        <label>Mobile Number<input value={customerForm.mobile_no} onChange={e=>setCustomerForm(prev=>({...prev,mobile_no:e.target.value}))}/></label>
        <label className="full">Address<textarea value={customerForm.address} onChange={e=>setCustomerForm(prev=>({...prev,address:e.target.value}))}/></label>
        <label>Opening Due<input type="number" step="0.01" value={customerForm.opening_due} onChange={e=>setCustomerForm(prev=>({...prev,opening_due:e.target.value}))}/></label>
        <div className="modal-actions"><button type="button" className="btn secondary" onClick={()=>{setShowCustomerForm(false);setEditingCustomer(null);setCustomerForm({...emptyCustomer})}}>Cancel</button><button type="submit" className="btn primary">{editingCustomer ? "Save Changes" : "Save Customer"}</button></div>
      </form>
    </div></div>
  }
  function ItemForm() {
    return <div className="modal-backdrop"><div className="modal">
      <div className="modal-head"><h3>{editingItem?"Edit Item":"Add Item"}</h3><button onClick={()=>setShowItemForm(false)}>×</button></div>
      <form onSubmit={saveItem} className="grid-form">
        <label>Master / Category<input value={itemForm.master_name} onChange={e=>setItemForm(prev=>({...prev,master_name:e.target.value}))}/></label>
        <label>Item Name*<input value={itemForm.item_name} onChange={e=>setItemForm(prev=>({...prev,item_name:e.target.value}))}/></label>
        <label>Sale Rate<input type="number" step="0.01" value={itemForm.sale_rate} onChange={e=>setItemForm(prev=>({...prev,sale_rate:e.target.value}))}/></label>
        <label>Purchase Rate<input type="number" step="0.01" value={itemForm.purchase_rate} onChange={e=>setItemForm(prev=>({...prev,purchase_rate:e.target.value}))}/></label>
        <label>Opening Stock<input type="number" step="0.01" value={itemForm.opening_stock} onChange={e=>setItemForm(prev=>({...prev,opening_stock:e.target.value}))}/></label>
        <label>Minimum Stock<input type="number" step="0.01" value={itemForm.minimum_stock} onChange={e=>setItemForm(prev=>({...prev,minimum_stock:e.target.value}))}/></label>
        <div className="modal-actions"><button type="button" className="btn secondary" onClick={()=>setShowItemForm(false)}>Cancel</button><button className="btn primary">Save Item</button></div>
      </form>
    </div></div>
  }
  function ReceiverForm() {
    return <div className="modal-backdrop"><div className="modal">
      <div className="modal-head"><h3>{editingReceiver?"Edit Receiver":"Add Receiver"}</h3><button onClick={()=>setShowReceiverForm(false)}>×</button></div>
      <form onSubmit={saveReceiver} className="grid-form">
        <label>Receiver Name*<input value={receiverForm.receiver_name} onChange={e=>setReceiverForm(prev=>({...prev,receiver_name:e.target.value}))}/></label>
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
        <label>Supplier Name*<input value={supplierForm.supplier_name} onChange={e=>setSupplierForm(prev=>({...prev,supplier_name:e.target.value}))}/></label>
        <label>Mobile Number<input value={supplierForm.mobile_no} onChange={e=>setSupplierForm(prev=>({...prev,mobile_no:e.target.value}))}/></label>
        <label className="full">Address<textarea value={supplierForm.address} onChange={e=>setSupplierForm(prev=>({...prev,address:e.target.value}))}/></label>
        <label>Opening Due<input type="number" step="0.01" value={supplierForm.opening_due} onChange={e=>setSupplierForm(prev=>({...prev,opening_due:e.target.value}))}/></label>
        <div className="modal-actions"><button type="button" className="btn secondary" onClick={()=>setShowSupplierForm(false)}>Cancel</button><button className="btn primary">Save Supplier</button></div>
      </form>
    </div></div>
  }

function Sidebar() {
    const all=[["dashboard","🏠","Dashboard"],["sales","🧾","Sales"],["customers","👥","Customers"],["collections","💰","Collections"],["stock","📦","Stock"],["procurement","🛒","Procurement"],["expenses","💸","Expenses"],["reports","📊","Reports"],["master","⚙️","Master"]];
    const links=profile?.role==="receiver"?all.filter(x=>["dashboard","sales","customers","collections","stock","reports"].includes(x[0])):all;
    return <><div className={mobileMenuOpen?"mobile-overlay open":"mobile-overlay"} onClick={()=>setMobileMenuOpen(false)}></div><aside className={mobileMenuOpen?"sidebar mobile-open":"sidebar"}><div className="brand">B REDDY SALES<span>{profile?.role==="receiver"?"Receiver Login":"Admin Login"}</span><button type="button" className="mobile-close" onClick={()=>setMobileMenuOpen(false)}>×</button></div>{links.map(([id,icon,label])=><button key={id} className={screen===id?"nav active":"nav"} onClick={()=>{go(id);setMobileMenuOpen(false)}}>{icon}<span>{label}</span></button>)}<button className="nav mobile-logout" onClick={logout}>🚪<span>Logout</span></button></aside></>;
  }

  function Dashboard() {
    const stockItems=items.map(i=>({ ...i, qty:Number(stockMap[i.id]||0) })).sort((a,b)=>a.item_name.localeCompare(b.item_name));
    const periodLabel=(p)=>p==="day"?"Day":p==="week"?"Week":"Month";
    const periodButtons=(value,setter)=><div className="period-buttons">{[["day","Day"],["week","Week"],["month","Month"]].map(([id,label])=><button type="button" key={id} className={value===id?"period-btn active":"period-btn"} onClick={()=>setter(id)}>{label}</button>)}</div>;
    return <><Header title="Dashboard"><button className="btn primary" onClick={()=>go("create-sale")}>＋ Create Sale</button></Header>
      <div className="dashboard-metric-cards">
        <MetricCard title="Sales" value={money(periodSalesTotal)} tone="sales" period={dashboardPeriod} setPeriod={setDashboardPeriod}/>
        <MetricCard title="Collections" value={money(periodCollectionsTotal)} tone="collections" period={dashboardPeriod} setPeriod={setDashboardPeriod}/>
        <MetricCard title="Net Profit" value={money(periodNetProfit)} tone="profit" period={dashboardPeriod} setPeriod={setDashboardPeriod}/>
        <MetricCard title="Total Due" value={money(periodDueTotal)} tone="due" period={dashboardPeriod} setPeriod={setDashboardPeriod}/>
      </div>
      <div className="panel">
        <div className="panel-title-row"><div><h3>Available Stock — Item Wise</h3><small>Click an item name to view stock history</small></div></div>
        <div className="stock-mini-grid">{stockItems.map(i=><div className={i.qty<=Number(i.minimum_stock||0)?"stock-mini-card low":"stock-mini-card"} key={i.id}><b className="link" onClick={()=>{setStockHistoryItem(i);go("stock")}}>{i.item_name}</b><span>{i.master_name||"Item"}</span><strong>{i.qty.toLocaleString("en-IN")}</strong><small>Available</small></div>)}{!stockItems.length&&<div className="empty">No items yet.</div>}</div>
      </div>
      <div className="panel">
        <div className="toolbar"><input placeholder="Customer name / mobile" value={customerSearch} onChange={e=>setCustomerSearch(e.target.value)}/><select><option>All Items</option>{items.map(i=><option key={i.id}>{i.item_name}</option>)}</select><select><option>All Status</option><option>Paid</option><option>Partial</option><option>Due</option></select><button type="button" className="btn secondary" onClick={()=>setCustomerSearch(customerSearch)}>Search</button></div>
        <h3 className="section-heading">Customer Due Summary</h3>
        <Table><thead><tr><th>Customer</th><th>Total Due</th><th>Last Invoice</th><th>Due &gt; 30 Days</th><th>Status</th></tr></thead><tbody>{filteredCustomers.map(c=>{const due=customerDue(c.id);const cs=sales.filter(s=>s.customer_id===c.id);const last=cs[0]?.invoice_date||"-";const old=cs.filter(s=>Math.floor((Date.now()-new Date(s.invoice_date))/86400000)>30).reduce((a,x)=>a+Number(x.due_amount||0),0);return <tr key={c.id}><td className="link" onClick={()=>{setSelectedCustomer(c);go("customer-detail")}}>{c.customer_name}</td><td>{money(due)}</td><td>{last}</td><td>{money(old)}</td><td><Status status={due>0?"DUE":"PAID"}/></td></tr>})}{!filteredCustomers.length&&<Empty col="5" text="No customers yet. Add a customer from Master."/ >}</tbody></Table>
      </div>
    </>;
  }

  function Card({t,v,tone=""}){return <div className={"card "+tone}><span>{t}</span><strong>{v}</strong></div>}
  function MetricCard({title,value,tone,period,setPeriod}){
    return <div className={`metric-card ${tone}`}><div className="metric-card-top"><span>{title} — {periodLabelFor(period)}</span><div className="metric-periods">{[["day","D"],["week","W"],["month","M"]].map(([id,label])=><button type="button" key={id} className={period===id?"active":""} onClick={()=>setPeriod(id)}>{label}</button>)}</div></div><strong>{value}</strong></div>;
  }
  function periodLabelFor(p){return p==="day"?"Day":p==="week"?"Week":"Month";}
  function Header({title,children}){
    const displayName=profile?.full_name||sessionUser?.email||"User";
    const email=profile?.email||sessionUser?.email||"";
    const initial=String(displayName).trim().charAt(0).toUpperCase()||"U";
    return <div className="header"><div className="header-title"><button type="button" className="mobile-menu-btn" onClick={()=>setMobileMenuOpen(true)}>☰</button><h1>{title}</h1></div><div className="header-right">{children}<div className="profile-wrap"><button type="button" className="profile-avatar" aria-label="Open profile" onClick={()=>setProfileMenuOpen(v=>!v)}>{initial}</button>{profileMenuOpen&&<><div className="profile-backdrop" onClick={()=>setProfileMenuOpen(false)}></div><div className="profile-menu"><div className="profile-menu-user"><div className="profile-menu-avatar">{initial}</div><div><b>{displayName}</b><small>{email}</small><span>{profile?.role==="receiver"?"Receiver":"Admin"}</span></div></div><button type="button" className="profile-signout" onClick={()=>{setProfileMenuOpen(false);logout();}}>↪ Sign out</button></div></>}</div></div></div>;
  }
  function Table({children,className=""}){
    const parts=Children.toArray(children);
    const thead=parts.find(x=>isValidElement(x)&&x.type==="thead");
    const headRow=thead && Children.toArray(thead.props.children)[0];
    const labels=headRow ? Children.toArray(headRow.props.children).map(x=>isValidElement(x)?String(x.props.children||"").replace(/<[^>]+>/g,"").trim():"") : [];
    const responsiveParts=parts.map(section=>{
      if(!isValidElement(section)||section.type!=="tbody") return section;
      const rows=Children.toArray(section.props.children).map(row=>{
        if(!isValidElement(row)||row.type!=="tr") return row;
        const cells=Children.toArray(row.props.children);
        return cloneElement(row,{children:cells.map((cell,i)=>{
          if(!isValidElement(cell)||cell.type!=="td") return cell;
          return cloneElement(cell,{"data-label":labels[i]||""});
        })});
      });
      return cloneElement(section,{children:rows});
    });
    return <div className={"table-wrap "+className}><table>{responsiveParts}</table></div>
  }
  function Empty({col,text}){return <tr><td colSpan={col} className="empty">{text}</td></tr>}
  function Status({status}){return <span className={"status "+String(status).toLowerCase()}>{status}</span>}

  function CreateSale() {
    const c = saleCustomerRecord;
    return <>
      <Header title="Create Sale">
        <div className="header-actions">
          <button className="btn secondary" onClick={()=>go("dashboard")}>Cancel</button>
        </div>
      </Header>
      <form className="panel sale-panel" onSubmit={createSale}>
        <div className="sale-summary-strip">
          <div><span>Invoice Date</span><b>{saleDate}</b></div>
          <div><span>Customer</span><b>{c?.customer_name || "Not selected"}</b></div>
          <div><span>Old Due</span><b>{money(c ? customerDue(c.id) : 0)}</b></div>
          <div className="sale-grand-total"><span>Total Value</span><b>{money(saleTotal)}</b></div>
        </div>

        <div className="grid-form sale-details">
          <label>Invoice Date<input type="date" value={saleDate} onChange={e=>setSaleDate(e.target.value)}/></label>
          <div className="picker-field">
            <span className="field-label">Customer Name*</span>
            <div className="picker-wrap">
              <button type="button" className={`selection-button ${c ? "selected" : ""}`} onClick={()=>{setOpenCustomerPicker(v=>!v);setOpenItemPicker(null);}}>
                {c ? (
                  <span className="selection-main"><b>{c.customer_name}</b><small>{c.mobile_no || "No mobile number"}</small></span>
                ) : (
                  <span className="selection-main"><b>Select Customer</b><small>Click to view customers</small></span>
                )}
                <span className="selection-arrow">⌄</span>
              </button>
              {c && <button type="button" className="picker-clear" aria-label="Clear customer" onClick={()=>{setSaleCustomer("");setSaleCustomerSearch("");setOpenCustomerPicker(false)}}>×</button>}
              {openCustomerPicker && <div className="picker-menu customer-menu">
                <div className="picker-heading">Select Customer</div>
                <input className="picker-search" placeholder="Search customer name / mobile" value={saleCustomerSearch} onChange={e=>setSaleCustomerSearch(e.target.value)} />
                <div className="picker-results">
                  {pickerCustomers.map(customer=><button type="button" className="picker-option" key={customer.id} onClick={()=>chooseSaleCustomer(customer)}>
                    <span><b>{customer.customer_name}</b><small>{customer.mobile_no || "No mobile"}</small></span>
                    <strong>Due {money(customerDue(customer.id))}</strong>
                  </button>)}
                  {!pickerCustomers.length && <div className="picker-empty">No customers found.</div>}
                </div>
              </div>}
            </div>
          </div>
          <label>Mobile Number<input value={c?.mobile_no||""} readOnly placeholder="Auto-filled"/></label>
          <label>Old Due<input value={c?money(customerDue(c.id)):money(0)} readOnly/></label>
        </div>

        <div className="section-title"><div><span>Sale Items</span><small>Select an item to add it to the invoice</small></div><button type="button" className="small-btn" onClick={()=>setSaleItems(prev=>[...prev,{item_id:"",rate:0,cost_rate:0,qty:1}])}>＋ Add Item</button></div>
        <div className="sale-items-list">
          {saleItems.map((x,i)=>{
            const it=items.find(a=>a.id===Number(x.item_id));
            const available=Number(stockMap[x.item_id]||0);
            const amount=Number(x.rate)*Number(x.qty);
            return <div className="sale-item-card" key={i}>
              <div className="sale-item-no">{i+1}</div>
              <div className="item-picker-cell">
                <span className="field-caption">Item</span>
                <div className="picker-wrap">
                  <button type="button" className={`selection-button item-selection ${it ? "selected" : ""}`} onClick={()=>{setOpenItemPicker(openItemPicker===i?null:i);setOpenCustomerPicker(false);setItemPickerSearch("")}}>
                    {it ? (
                      <span className="selection-main"><b>{it.item_name}</b><small>{it.master_name || "No master"} · Stock {available}</small></span>
                    ) : (
                      <span className="selection-main"><b>Select Item</b><small>Click to view items</small></span>
                    )}
                    <span className="selection-arrow">⌄</span>
                  </button>
                  {openItemPicker===i && <div className="picker-menu item-menu">
                    <div className="picker-heading">Select Item</div>
                    <input className="picker-search" placeholder="Search master name / item name" value={itemPickerSearch} onChange={e=>setItemPickerSearch(e.target.value)} />
                    <div className="picker-results">
                      {pickerItems.map(item=><button type="button" className="picker-option" key={item.id} onClick={()=>chooseSaleItem(i,item)}>
                        <span><b>{item.item_name}</b><small>{item.master_name || "No master"}</small></span>
                        <strong>{money(item.sale_rate)} · {Number(stockMap[item.id]||0)} stock</strong>
                      </button>)}
                      {!pickerItems.length && <div className="picker-empty">No items found.</div>}
                    </div>
                  </div>}
                </div>
              </div>
              <div><span className="field-caption">Sale Rate</span><input className="compact-input" type="number" min="0" step="0.01" value={x.rate} onChange={e=>setSaleItem(i,"rate",e.target.value)}/></div>
              <div className="cost-picker-cell"><span className="field-caption">Purchased Rate / Cost</span>
                <button type="button" className={`cost-picker-button ${x.cost_rate?"selected":""}`} onClick={()=>{setOpenCustomerPicker(false);setOpenItemPicker(null);setOpenCostPicker(i)}}><span>{x.cost_rate?money(x.cost_rate):"Select purchase rate"}</span><b>⌄</b></button>
              </div>
              <div><span className="field-caption">Qty</span><input className="compact-input" type="number" min="0.01" step="0.01" value={x.qty} onChange={e=>setSaleItem(i,"qty",e.target.value)}/></div>
              <div className="stock-cell"><span className="field-caption">Rate Stock</span><b className={Number(x.qty)>getPurchaseRateBatches(x.item_id,saleDate).find(b=>Math.abs(Number(b.rate)-Number(x.cost_rate||0))<0.005)?.available?"stock-danger":"stock-good"}>{getPurchaseRateBatches(x.item_id,saleDate).find(b=>Math.abs(Number(b.rate)-Number(x.cost_rate||0))<0.005)?.available ?? available}</b></div>
              <div className="amount-cell"><span className="field-caption">Amount</span><b>{money(amount)}</b></div>
              <button type="button" className="icon-btn" aria-label="Remove item" onClick={()=>setSaleItems(prev=>prev.length>1?prev.filter((_,j)=>j!==i):prev)}>×</button>
            </div>
          })}
        </div>

        <div className="payment-layout">
          <div className="invoice-total-box"><span>Invoice Total</span><strong>{money(saleTotal)}</strong><small>Old Due: {money(c ? customerDue(c.id) : 0)}</small></div>
          <div className="payment-box payment-modern">
            <label>Payment Status<select value={salePayment} onChange={e=>setSalePayment(e.target.value)}><option value="PAID">Paid</option><option value="PARTIAL">Partially Paid</option><option value="DUE">Due</option></select></label>
            {salePayment==="PARTIAL"&&<label>Paid Amount<input type="number" min="0" step="0.01" value={salePaid} onChange={e=>setSalePaid(e.target.value)}/></label>}
            {salePayment!=="DUE"&&<><label>Receiver<select value={saleReceiver} onChange={e=>setSaleReceiver(e.target.value)}><option value="">Select Receiver</option>{receivers.map(r=><option key={r.id} value={r.id}>{r.receiver_name}</option>)}</select></label><label>Received As<select value={salePaymentMode} onChange={e=>setSalePaymentMode(e.target.value)}><option value="CASH">Cash</option><option value="PHONEPE">PhonePe</option></select></label></>}
            <div className="due-preview">Balance Due <b>{money(dueForSale)}</b></div>
          </div>
        </div>
        <div className="form-actions"><button className="btn primary btn-large">Save Sale</button></div>
      </form>
    </>
  }

  function Customers(){
    return <><Header title="Customers"><button className="btn primary" onClick={()=>{setEditingCustomer(null);setCustomerForm({...emptyCustomer});setShowCustomerForm(true)}}>＋ Add Customer</button></Header>
      <div className="panel customer-filters">
        <label>Search Customer<input placeholder="Name or mobile" value={customerSearch} onChange={e=>setCustomerSearch(e.target.value)}/></label>
        <label>Due Status<select value={customerDueFilter} onChange={e=>setCustomerDueFilter(e.target.value)}><option value="">All Customers</option><option value="due">With Due</option><option value="clear">No Due</option></select></label>
        <button type="button" className="btn secondary filter-clear" onClick={()=>{setCustomerSearch("");setCustomerDueFilter("")}}>Clear</button>
      </div>
      <div className="panel"><Table><thead><tr><th>Customer</th><th>Mobile</th><th>Address</th><th>Opening Due</th><th>Current Due</th><th>Action</th></tr></thead><tbody>{filteredCustomers.map(c=><tr key={c.id}><td className="link" onClick={()=>{setSelectedCustomer(c);go("customer-detail")}}>{c.customer_name}</td><td>{c.mobile_no||"-"}</td><td>{c.address||"-"}</td><td>{money(c.opening_due)}</td><td>{money(customerDue(c.id))}</td><td><button className="text-btn" onClick={()=>{setEditingCustomer(c.id);setCustomerForm({customer_name:c.customer_name,mobile_no:c.mobile_no||"",address:c.address||"",opening_due:c.opening_due});setShowCustomerForm(true)}}>Edit</button><button className="text-btn danger" onClick={()=>deleteCustomer(c.id)}>Delete</button></td></tr>)}{!filteredCustomers.length&&<Empty col="6" text="No customers found."/>}</tbody></Table></div>{showCustomerForm&&<CustomerForm/>}</>
  }

  function CustomerDetail(){
    const c=selectedCustomer; const list=sales.filter(s=>s.customer_id===c?.id);
    const total=list.reduce((a,x)=>a+Number(x.total_amount||0),0), paid=list.reduce((a,x)=>a+Number(x.paid_amount||0),0), due=customerDue(c?.id);
    return <><Header title={c?c.customer_name:"Customer"}><div className="header-actions"><button className="btn secondary nav-back" onClick={()=>go("customers")}>← Back</button><button className="btn primary" onClick={()=>{setPaymentCustomer(String(c?.id||""));setPaymentInvoiceId(null);go("customer-payment")}}>＋ Collect Amount</button></div></Header>
      <div className="cards customer-summary">
        <Card t="Total Invoices" v={list.length} tone="info"/><Card t="Invoice Value" v={money(total)} tone="sales"/><Card t="Paid Amount" v={money(paid)} tone="collections"/><Card t="Balance Due" v={money(due)} tone="due"/>
      </div>
      <div className="panel"><div className="panel-title-row"><h3>Invoice Summary</h3><small>Customer invoice history</small></div><Table><thead><tr><th>Invoice</th><th>Date</th><th>Amount</th><th>Paid</th><th>Due</th><th>Status</th></tr></thead><tbody>{list.map(s=><tr key={s.id}><td className="link" onClick={()=>{setSelectedInvoice(s);go("invoice-detail")}}>{s.invoice_no}</td><td>{s.invoice_date}</td><td>{money(s.total_amount)}</td><td>{money(s.paid_amount)}</td><td>{money(s.due_amount)}</td><td><Status status={s.payment_status}/></td></tr>)}{!list.length&&<Empty col="6" text="No invoices for this customer."/ >}</tbody></Table></div>
    </> 
  }
  function InvoiceDetail(){
    const s=selectedInvoice;
    const linkedCollections=collections.filter(c=>(c.collection_allocations||[]).some(a=>Number(a.sale_id)===Number(s?.id)));
    function printInvoice(){window.print();}
    async function shareInvoicePdf(){
      const doc=new jsPDF();
      doc.setFontSize(18);doc.text("B REDDY SALES",14,16);
      doc.setFontSize(13);doc.text(`Invoice: ${s?.invoice_no||""}`,14,27);
      doc.setFontSize(10);doc.text(`Customer: ${s?.customers?.customer_name||""}`,14,35);
      doc.text(`Date: ${s?.invoice_date||""}`,14,42);
      let y=54;doc.setFont("helvetica","bold");doc.text("Item",14,y);doc.text("Qty",92,y);doc.text("Sale",115,y);doc.text("Cost",140,y);doc.text("Amount",170,y);y+=7;doc.setFont("helvetica","normal");
      (s?.sale_items||[]).forEach(x=>{const cost=Number(x.cost_rate||0)||Number(x.item_master?.purchase_rate||0);doc.text(String(x.item_master?.item_name||""),14,y);doc.text(String(x.qty||0),92,y);doc.text(money(x.rate),115,y);doc.text(money(cost),140,y);doc.text(money(x.amount),170,y);y+=7;if(y>275){doc.addPage();y=18}});
      y+=5;doc.setFont("helvetica","bold");doc.text(`Total: ${money(s?.total_amount)}`,14,y);y+=7;doc.text(`Paid: ${money(s?.paid_amount)}`,14,y);y+=7;doc.text(`Due: ${money(s?.due_amount)}`,14,y);
      const blob=doc.output("blob"), file=new File([blob],`${s?.invoice_no||"invoice"}.pdf`,{type:"application/pdf"});
      if(navigator.share && navigator.canShare && navigator.canShare({files:[file]})){await navigator.share({title:`Invoice ${s?.invoice_no}`,text:`Invoice ${s?.invoice_no} - ${s?.customers?.customer_name||""}`,files:[file]});}
      else {doc.save(`${s?.invoice_no||"invoice"}.pdf`);window.open(`https://wa.me/?text=${encodeURIComponent(`Invoice ${s?.invoice_no} - ${s?.customers?.customer_name||""}`)}`,"_blank");}
    }
    return <><Header title={s?.invoice_no||"Invoice"}><div className="header-actions"><button className="btn secondary nav-back" onClick={()=>go("customer-detail")}>← Back</button>{Number(s?.due_amount)>0&&<button className="btn primary" onClick={()=>{setPaymentCustomer(String(s.customer_id));setPaymentInvoiceId(s.id);setPaymentAmounts({});setPaymentOldDue("");go("customer-payment")}}>Collect Payment</button>}<button className="btn secondary" onClick={printInvoice}>🖨 PDF / Print</button><button className="btn secondary" onClick={shareInvoicePdf}>📄 Share PDF</button></div></Header>
      <div className="panel invoice printable-area">
        <div className="invoice-head"><div><b>{s?.customers?.customer_name}</b><div>{s?.customers?.mobile_no}</div></div><div>Date: {s?.invoice_date}</div></div>
        <Table><thead><tr><th>Master</th><th>Item</th><th>Sale Rate</th><th>Purchase Rate</th><th>Qty</th><th>Amount</th><th>Profit</th></tr></thead><tbody>{(s?.sale_items||[]).map(x=>{const cost=Number(x.cost_rate||0)||Number(x.item_master?.purchase_rate||0);const profit=(Number(x.rate||0)-cost)*Number(x.qty||0);return <tr key={x.id}><td>{x.item_master?.master_name||"-"}</td><td>{x.item_master?.item_name}</td><td>{money(x.rate)}</td><td>{money(cost)}</td><td>{x.qty}</td><td>{money(x.amount)}</td><td>{money(profit)}</td></tr>})}</tbody></Table>
        <div className="invoice-total">Total {money(s?.total_amount)} · Paid {money(s?.paid_amount)} · Due {money(s?.due_amount)}</div>
        <div className="invoice-profit-summary"><b>Invoice Profit</b><strong>{money((s?.sale_items||[]).reduce((a,x)=>a+(Number(x.rate||0)-(Number(x.cost_rate||0)||Number(x.item_master?.purchase_rate||0)))*Number(x.qty||0),0))}</strong><small>Formula: Σ [(Sale Rate − Purchased Rate) × Qty]</small></div>
      </div>
      <div className="panel"><h3>Collection History</h3><Table><thead><tr><th>Collection</th><th>Date</th><th>Amount</th><th>Remarks</th></tr></thead><tbody>{linkedCollections.map(c=><tr key={c.id}><td className="link" onClick={()=>editCollection(c)}>{c.collection_no}</td><td>{c.collection_date}</td><td>{money(c.total_amount)}</td><td>{c.remarks||`Payment for ${s?.invoice_no}`}</td></tr>)}{!linkedCollections.length&&<Empty col="4" text="No collection against this invoice yet."/>}</tbody></Table></div>
    </>
  }
  function PurchaseRateModal({index}){
    const row=saleItems[index];
    const batches=getPurchaseRateBatches(row?.item_id,saleDate);
    const item=items.find(x=>x.id===Number(row?.item_id));
    if(!row) return null;
    return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setOpenCostPicker(null)}}>
      <div className="modal purchase-rate-modal">
        <div className="modal-head"><div><span className="eyebrow">STOCK COST SELECTION</span><h3>Select Purchase Rate</h3><small>{item?.item_name||"Item"} · {batches.reduce((a,b)=>a+Number(b.available||0),0)} available</small></div><button type="button" onClick={()=>setOpenCostPicker(null)}>×</button></div>
        <div className="rate-summary"><div><span>Required Qty</span><b>{Number(row.qty||0)}</b></div><div><span>Selected Rate</span><b>{row.cost_rate?money(row.cost_rate):"Not selected"}</b></div><div><span>Available Lots</span><b>{batches.length}</b></div></div>
        <div className="rate-list">{batches.map((b,bi)=><button type="button" key={`${b.rate}-${bi}-${b.label}`} className={`rate-lot ${Number(row.cost_rate)===Number(b.rate)?"selected":""}`} onClick={()=>{setSaleItem(index,"cost_rate",b.rate);setOpenCostPicker(null)}}><div className="rate-lot-main"><div><span><b>{money(b.rate)} / unit</b></span><small>{b.label||"Opening / existing stock"} · {b.purchases?.[0]?.purchase_date?displayDate(b.purchases[0].purchase_date):"Opening stock"}</small></div><b>{Number(b.available).toLocaleString("en-IN")} available</b></div></button>)}{!batches.length&&<div className="empty">No purchase-rate stock is available for this item.</div>}</div>
        <div className="modal-actions"><button type="button" className="btn secondary" onClick={()=>setOpenCostPicker(null)}>Cancel</button></div>
      </div>
    </div>;
  }

  function Sales(){
    const rows=sales.filter(s=>{
      if(s.invoice_date>salesAsOnDate) return false;
      if(invoiceSearch && !String(s.invoice_no||"").toLowerCase().includes(invoiceSearch.toLowerCase())) return false;
      if(invoiceCustomerFilter && s.customer_id!==Number(invoiceCustomerFilter)) return false;
      if(invoiceStatusFilter && String(s.payment_status||"").toLowerCase()!==invoiceStatusFilter.toLowerCase()) return false;
      if(invoiceDateFrom && s.invoice_date<invoiceDateFrom) return false;
      if(invoiceDateTo && s.invoice_date>invoiceDateTo) return false;
      return true;
    });
    return <><Header title="Sales / Invoices"><div className="header-actions"><label className="header-date">As on Date<input type="date" value={salesAsOnDate} onChange={e=>setSalesAsOnDate(e.target.value)}/></label><button className="btn primary" onClick={()=>go("create-sale")}>＋ Create Sale</button></div></Header>
      <div className="panel invoice-filters">
        <label>Invoice No.<input placeholder="Search invoice" value={invoiceSearch} onChange={e=>setInvoiceSearch(e.target.value)}/></label>
        <label>Customer<select value={invoiceCustomerFilter} onChange={e=>setInvoiceCustomerFilter(e.target.value)}><option value="">All Customers</option>{customers.map(c=><option key={c.id} value={c.id}>{c.customer_name}</option>)}</select></label>
        <label>Status<select value={invoiceStatusFilter} onChange={e=>setInvoiceStatusFilter(e.target.value)}><option value="">All Status</option><option value="PAID">Paid</option><option value="PARTIAL">Partially Paid</option><option value="DUE">Due</option></select></label>
        <label>From Date<input type="date" value={invoiceDateFrom} onChange={e=>setInvoiceDateFrom(e.target.value)}/></label>
        <label>To Date<input type="date" value={invoiceDateTo} onChange={e=>setInvoiceDateTo(e.target.value)}/></label>
        <button type="button" className="btn secondary filter-clear" onClick={()=>{setInvoiceSearch("");setInvoiceCustomerFilter("");setInvoiceStatusFilter("");setInvoiceDateFrom("");setInvoiceDateTo("")}}>Clear</button>
      </div>
      <div className="panel"><div className="panel-title-row"><div><h3>Sales Register</h3><small>{rows.length} invoices matching filters · up to {salesAsOnDate}</small></div></div><Table><thead><tr><th>Invoice</th><th>Date</th><th>Customer</th><th>Amount</th><th>Paid</th><th>Due</th><th>Status</th><th>Audit</th></tr></thead><tbody>{rows.map(s=><tr key={s.id}><td className="link" onClick={()=>{setSelectedInvoice(s);go("invoice-detail")}}>{s.invoice_no}</td><td>{s.invoice_date}</td><td>{s.customers?.customer_name}</td><td>{money(s.total_amount)}</td><td>{money(s.paid_amount)}</td><td>{money(s.due_amount)}</td><td><Status status={s.payment_status}/></td><td><button type="button" className="small-btn secondary" onClick={()=>setAuditTarget({table:"sales",id:s.id,label:s.invoice_no})}>Audit</button></td></tr>)}{!rows.length&&<Empty col="8" text="No invoices match the selected filters."/>}</tbody></Table></div></>
  }

  function CustomerPayment(){
    const customer=customers.find(c=>c.id===Number(paymentCustomer));
    const dueSales=sales.filter(s=>s.customer_id===Number(paymentCustomer)&&Number(s.due_amount||0)>0);
    const selectedInvoice=paymentInvoiceId?dueSales.find(s=>s.id===Number(paymentInvoiceId)):null;
    const invoiceRows=selectedInvoice?[selectedInvoice]:dueSales;
    const invoiceTotal=Object.values(paymentAmounts).reduce((a,v)=>a+Number(v||0),0);
    const oldDue=Math.min(Number(paymentOldDue||0),Number(customer?.opening_due||0));
    const total=invoiceTotal+oldDue;
    return <><Header title="Collect Amount"><button className="btn secondary" onClick={()=>go("collections")}>Collection Register</button></Header>
      <div className="panel customer-payment-head"><div><span className="eyebrow">CUSTOMER COLLECTION</span><h2>Receive Payment</h2><p>Record collections against customer invoices or opening due.</p></div><div className="payment-total-due"><small>Collection Amount</small><strong>{money(total)}</strong></div></div>
      <form className="panel customer-payment-form" onSubmit={makePayment}>
        <div className="grid-form">
          <label>Customer*<select value={paymentCustomer} onChange={e=>{setPaymentCustomer(e.target.value);setPaymentAmounts({});setPaymentOldDue("");setPaymentInvoiceId(null)}}><option value="">Select Customer</option>{customers.map(c=><option key={c.id} value={c.id}>{c.customer_name} · Due {money(customerDue(c.id))}</option>)}</select></label>
          <label>Collection Date<input type="date" value={paymentDate} onChange={e=>setPaymentDate(e.target.value)}/></label>
          <label>Receiver*<select value={paymentReceiver} onChange={e=>setPaymentReceiver(e.target.value)}><option value="">Select Receiver</option>{receivers.map(r=><option key={r.id} value={r.id}>{r.receiver_name}</option>)}</select></label>
          <label>Received As<select value={paymentMode} onChange={e=>setPaymentMode(e.target.value)}><option value="CASH">Cash</option><option value="PHONEPE">PhonePe</option></select></label>
        </div>
        <div className="section-title"><div><span>Invoice Allocation</span><small>Enter the amount received against each invoice.</small></div></div>
        <Table><thead><tr><th>Invoice</th><th>Date</th><th>Invoice Amount</th><th>Already Paid</th><th>Balance Due</th><th>Collect</th></tr></thead><tbody>
          {invoiceRows.map(s=><tr key={s.id}><td>{s.invoice_no}</td><td>{s.invoice_date}</td><td>{money(s.total_amount)}</td><td>{money(s.paid_amount)}</td><td>{money(s.due_amount)}</td><td><input className="compact-input" type="number" min="0" max={s.due_amount} step="0.01" value={paymentAmounts[s.id]||""} onChange={e=>setPaymentAmounts(v=>({...v,[s.id]:e.target.value}))}/></td></tr>)}
          {!invoiceRows.length&&<Empty col="6" text={paymentCustomer?"No outstanding invoices for this customer.":"Select a customer to see outstanding invoices."}/>}</tbody></Table>
        <div className="old-due-row"><label>Opening / Old Due Collection<input type="number" min="0" max={customer?.opening_due||0} step="0.01" value={paymentOldDue} onChange={e=>setPaymentOldDue(e.target.value)} placeholder="0.00"/></label><label className="full">Remarks<textarea value={paymentNote} onChange={e=>setPaymentNote(e.target.value)} placeholder="Collection remarks"/></label></div>
        <div className="form-actions"><button type="button" className="btn secondary" onClick={()=>go("collections")}>Cancel</button><button className="btn primary" disabled={!paymentCustomer||!paymentReceiver||total<=0}>Save Collection</button></div>
      </form>
    </>
  }

  function Collections(){
    const filteredCollections=collectionsDataFilter(collections,collectionSearch,collectionDateFrom,collectionDateTo,collectionReceiverFilter).filter(c=>c.collection_date<=collectionsAsOnDate);
    function editCollection(c){
      setEditingCollection(c);
      setCollectionForm({collection_date:c.collection_date,receiver_id:String(c.receiver_id||""),payment_mode:c.payment_mode||"CASH",total_amount:Number(c.total_amount||0),remarks:c.remarks||""});
    }
    return <><Header title="Collections"><button className="btn primary" onClick={()=>{setPaymentCustomer("");setPaymentAmounts({});setPaymentOldDue("");setPaymentInvoiceId(null);go("customer-payment")}}>＋ Collect Amount</button></Header>
      <div className="panel collection-filters">
        <label>Collection No.<input placeholder="Search collection" value={collectionSearch} onChange={e=>setCollectionSearch(e.target.value)}/></label>
        <label>From Date<input type="date" value={collectionDateFrom} onChange={e=>setCollectionDateFrom(e.target.value)}/></label>
        <label>To Date<input type="date" value={collectionDateTo} onChange={e=>setCollectionDateTo(e.target.value)}/></label>
        <label>Receiver<select value={collectionReceiverFilter} onChange={e=>setCollectionReceiverFilter(e.target.value)}><option value="">All Receivers</option>{receivers.map(r=><option key={r.id} value={r.id}>{r.receiver_name}</option>)}</select></label>
        <button type="button" className="btn secondary filter-clear" onClick={()=>{setCollectionSearch("");setCollectionDateFrom("");setCollectionDateTo("");setCollectionReceiverFilter("")}}>Clear</button>
      </div>
      <div className="panel"><div className="panel-title-row"><div><h3>Collection Register</h3><small>{filteredCollections.length} collections up to {collectionsAsOnDate}</small></div></div><Table><thead><tr><th>Collection No.</th><th>Date</th><th>Customer</th><th>Receiver</th><th>Received As</th><th>Amount</th><th>Remarks</th><th>Audit</th></tr></thead>
        <tbody>{filteredCollections.map(c=><tr key={c.id}>
          <td className="link" onClick={()=>editCollection(c)}>{c.collection_no}</td><td>{c.collection_date}</td><td>{c.customers?.customer_name}</td><td>{c.receivers?.receiver_name}</td><td>{c.payment_mode==="PHONEPE"?"PhonePe":"Cash"}</td><td>{money(c.total_amount)}</td><td>{c.remarks||"-"}</td><td><button type="button" className="small-btn secondary" onClick={()=>setAuditTarget({table:"collections",id:c.id,label:c.collection_no||`Collection #${c.id}`})}>Audit</button></td>
        </tr>)}{!filteredCollections.length&&<Empty col="8" text="No collections found."/>}</tbody></Table></div>
      {editingCollection&&<CollectionEditModal/>}
    </>
  }

  function collectionsDataFilter(rows,search,from,to,receiverId){
    const q=String(search||"").trim().toLowerCase();
    return rows.filter(c=>
      (!q || String(c.collection_no||"").toLowerCase().includes(q)) &&
      (!from || c.collection_date>=from) &&
      (!to || c.collection_date<=to) &&
      (!receiverId || c.receiver_id===Number(receiverId))
    );
  }

  function CollectionEditModal(){
    const c=editingCollection;
    async function saveCollectionEdit(e){
      e.preventDefault();
      const newAmount=Number(collectionForm.total_amount||0);
      if(newAmount<=0) return flash("Collection amount must be greater than zero.");
      const oldAmount=Number(c.total_amount||0);
      const oldReceiverId=Number(c.receiver_id);
      const newReceiverId=Number(collectionForm.receiver_id);
      const allocations=c.collection_allocations||[];

      // Restore old accounting first.
      if(oldReceiverId && oldAmount){
        const oldR=receivers.find(r=>r.id===oldReceiverId);
        await db.from("receivers").update({current_balance:Number(oldR?.current_balance||0)-oldAmount}).eq("id",oldReceiverId);
      }
      for(const a of allocations){
        const sale=sales.find(s=>s.id===Number(a.sale_id));
        if(sale){
          const paid=Math.max(0,Number(sale.paid_amount||0)-Number(a.amount||0));
          const due=Math.max(0,Number(sale.total_amount||0)-paid);
          await db.from("sales").update({paid_amount:paid,due_amount:due,payment_status:due===0?"PAID":paid>0?"PARTIAL":"DUE"}).eq("id",sale.id);
        }
      }
      if(!allocations.length){
        const customer=customers.find(x=>x.id===Number(c.customer_id));
        if(customer) await db.from("customers").update({opening_due:Number(customer.opening_due||0)+oldAmount}).eq("id",customer.id);
      }

      // Update collection header.
      const {error:uErr}=await db.from("collections").update({
        collection_date:collectionForm.collection_date,
        receiver_id:newReceiverId,
        payment_mode:collectionForm.payment_mode||"CASH",
        total_amount:newAmount,
        remarks:collectionForm.remarks
      }).eq("id",c.id);
      if(uErr) return flash(uErr.message);

      // Re-apply the edited amount to its existing allocation, or to old due.
      if(allocations.length===1){
        const a=allocations[0], sale=sales.find(s=>s.id===Number(a.sale_id));
        if(!sale) return flash("Linked invoice was not found.");
        const applied=Math.min(Number(sale.total_amount),newAmount);
        await db.from("collection_allocations").update({amount:applied}).eq("id",a.id);
        const paid=Number(sale.paid_amount||0)+applied;
        const due=Math.max(0,Number(sale.total_amount)-paid);
        await db.from("sales").update({paid_amount:paid,due_amount:due,payment_status:due===0?"PAID":"PARTIAL"}).eq("id",sale.id);
      } else if(allocations.length===0){
        const customer=customers.find(x=>x.id===Number(c.customer_id));
        if(customer) await db.from("customers").update({opening_due:Math.max(0,Number(customer.opening_due||0)-newAmount)}).eq("id",customer.id);
      } else {
        // Multi-invoice collections keep their existing allocations; amount can still be edited as a header value.
        for(const a of allocations){
          const sale=sales.find(s=>s.id===Number(a.sale_id));
          if(sale){
            const paid=Number(sale.paid_amount||0)+Number(a.amount||0);
            const due=Math.max(0,Number(sale.total_amount||0)-paid);
            await db.from("sales").update({paid_amount:paid,due_amount:due,payment_status:due===0?"PAID":"PARTIAL"}).eq("id",sale.id);
          }
        }
      }
      const newR=receivers.find(r=>r.id===newReceiverId);
      if(newR){
        const baseBalance=Number(newR.current_balance||0)-(oldReceiverId===newReceiverId?oldAmount:0);
        await db.from("receivers").update({current_balance:baseBalance+newAmount}).eq("id",newReceiverId);
      }

      setEditingCollection(null); await loadAll(); flash("Collection updated successfully.");
    }
    const linkedInvoices=(c.collection_allocations||[]).map(a=>sales.find(s=>s.id===Number(a.sale_id))).filter(Boolean);
    const isOldDue=!linkedInvoices.length;
    return <div className="modal-backdrop"><div className="modal">
      <div className="modal-head"><div><h3>Edit Collection {c.collection_no}</h3><small>{isOldDue?"Old Due Collection":`Invoice: ${linkedInvoices.map(x=>x.invoice_no).join(", ")}`}</small></div><button type="button" onClick={()=>setEditingCollection(null)}>×</button></div>
      <div className="collection-context">{isOldDue?<b>Reference: Customer Old Due</b>:linkedInvoices.map(x=><span key={x.id}>Invoice {x.invoice_no} · Due {money(x.due_amount)}</span>)}</div>
      <form className="grid-form" onSubmit={saveCollectionEdit}>
        <label>Collection Date<input type="date" value={collectionForm.collection_date} onChange={e=>setCollectionForm(v=>({...v,collection_date:e.target.value}))}/></label>
        <label>Receiver<select value={collectionForm.receiver_id} onChange={e=>setCollectionForm(v=>({...v,receiver_id:e.target.value}))}><option value="">Select Receiver</option>{receivers.map(r=><option key={r.id} value={r.id}>{r.receiver_name}</option>)}</select></label>
        <label>Received As<select value={collectionForm.payment_mode} onChange={e=>setCollectionForm(v=>({...v,payment_mode:e.target.value}))}><option value="CASH">Cash</option><option value="PHONEPE">PhonePe</option></select></label>
        <label>Amount<input type="number" min="0.01" step="0.01" value={collectionForm.total_amount} disabled={(c.collection_allocations||[]).length>1} onChange={e=>setCollectionForm(v=>({...v,total_amount:e.target.value}))}/>{(c.collection_allocations||[]).length>1&&<small>Multiple invoices: amount is tied to the existing allocations.</small>}</label>
        <label className="full">Remarks<textarea value={collectionForm.remarks} onChange={e=>setCollectionForm(v=>({...v,remarks:e.target.value}))}/></label>
        <div className="modal-actions"><button type="button" className="btn secondary" onClick={()=>setEditingCollection(null)}>Cancel</button><button className="btn primary">Save Changes</button></div>
      </form>
    </div></div>
  }

  function Stock(){
    const stockAtDate={};
    items.forEach(i=>stockAtDate[i.id]=Number(i.opening_stock||0));
    stockTxns.filter(t=>t.transaction_date<=stockAsOnDate).forEach(t=>{stockAtDate[t.item_id]=Number(stockAtDate[t.item_id]||0)+Number(t.qty_in||0)-Number(t.qty_out||0)});
    const history=stockHistoryItem ? stockTxns.filter(t=>t.item_id===stockHistoryItem.id && t.transaction_type==="PURCHASE" && t.transaction_date<=stockAsOnDate).sort((a,b)=>new Date(b.transaction_date)-new Date(a.transaction_date)) : [];
    return <><Header title="Stock"><div className="header-actions"><label className="header-date">Stock As on Date<input type="date" value={stockAsOnDate} onChange={e=>setStockAsOnDate(e.target.value)}/></label><button className="btn primary btn-highlight" onClick={()=>{setMasterTab("items");go("master")}}>📦 Manage Items</button></div></Header>
      <div className="panel"><Table><thead><tr><th>Item</th><th>Opening</th><th>Purchase</th><th>Sales</th><th>Available</th><th>Minimum</th></tr></thead>
        <tbody>{items.map(i=>{const tx=stockTxns.filter(x=>x.item_id===i.id&&x.transaction_date<=stockAsOnDate);const pur=tx.reduce((a,x)=>a+Number(x.qty_in||0),0),sal=tx.reduce((a,x)=>a+Number(x.qty_out||0),0);return <tr key={i.id} className={stockAtDate[i.id]<=Number(i.minimum_stock||0)?"low-stock":""}>
          <td className="link" onClick={()=>setStockHistoryItem(i)}>{i.item_name}</td><td>{i.opening_stock}</td><td>{pur}</td><td>{sal}</td><td><b>{Number(stockAtDate[i.id]||0).toLocaleString("en-IN")}</b></td><td>{i.minimum_stock}</td>
        </tr>})}{!items.length&&<Empty col="6" text="No items yet."/>}</tbody>
      </Table></div>
      {stockHistoryItem&&<div className="modal-backdrop"><div className="modal stock-history-modal">
        <div className="modal-head"><div><h3>{stockHistoryItem.item_name} — Procurement History</h3><small>Up to {stockAsOnDate}</small></div><button type="button" onClick={()=>setStockHistoryItem(null)}>×</button></div>
        <Table><thead><tr><th>Date</th><th>Purchase No.</th><th>Supplier</th><th>Rate</th><th>Qty</th><th>Amount</th></tr></thead>
          <tbody>{history.map(t=>{const pur=purchases.find(x=>x.id===Number(t.reference_id));const pi=pur?.purchase_items?.find(x=>x.item_id===stockHistoryItem.id);return <tr key={t.id}><td>{t.transaction_date}</td><td>{pur?.purchase_no||"-"}</td><td>{pur?.suppliers?.supplier_name||"-"}</td><td>{money(t.rate)}</td><td>{t.qty_in}</td><td>{money(pi?.amount || Number(t.rate)*Number(t.qty_in))}</td></tr>})}{!history.length&&<Empty col="6" text="No procurement history for this item."/>}</tbody>
        </Table>
      </div></div>}
    </>
  }

  function Procurement(){
    const rows=purchases.filter(p=>{
      if(p.purchase_date>procurementAsOnDate) return false;
      if(procurementSearch && !String(p.purchase_no||"").toLowerCase().includes(procurementSearch.toLowerCase())) return false;
      if(procurementSupplierFilter && p.supplier_id!==Number(procurementSupplierFilter)) return false;
      if(procurementStatusFilter && String(p.payment_status||"").toLowerCase()!==procurementStatusFilter.toLowerCase()) return false;
      if(procurementDateFrom && p.purchase_date<procurementDateFrom) return false;
      if(procurementDateTo && p.purchase_date>procurementDateTo) return false;
      return true;
    });
    return <><Header title="Procurement"><div className="header-actions"><label className="header-date">As on Date<input type="date" value={procurementAsOnDate} onChange={e=>setProcurementAsOnDate(e.target.value)}/></label><button className="btn primary" onClick={()=>{setEditingPurchase(null);setPurchaseDate(today());setPurchaseSupplier("");setPurchaseItems([{item_id:"",rate:0,qty:1}]);setPurchasePayment("DUE");setPurchasePaid(0);setPurchaseReceiver("");setPurchasePaymentMode("CASH");setPurchaseTransport(0);setPurchaseLoading(0);setPurchaseUnloading(0);setPurchaseChargesPaidBy("Business");setPurchaseChargesReceiver("");go("purchase")}}>＋ Purchase</button></div></Header>
      <div className="panel procurement-payment-strip"><div className="panel-title-row"><div><span className="eyebrow">SUPPLIER PAYMENTS</span><h3>Purchase Bills Due</h3><small>Pay supplier bills directly from Procurement.</small></div><strong>{money(purchases.reduce((a,p)=>a+Number(p.due_amount||0),0))}</strong></div><div className="due-bill-list">{purchases.filter(p=>Number(p.due_amount||0)>0 && p.purchase_date<=procurementAsOnDate).slice(0,8).map(p=><div className="due-bill-row" key={p.id}><div><b>{p.purchase_no}</b><span>{p.suppliers?.supplier_name||"-"} · {displayDate(p.purchase_date)}</span></div><div><small>Due</small><strong>{money(p.due_amount)}</strong></div><button type="button" className="small-btn primary" onClick={()=>{setPurchasePaymentId(p.id);setPurchasePaymentAmount("");setPurchasePaymentDate(today());setPurchasePaymentReceiver(p.receiver_id?String(p.receiver_id):"");setPurchasePaymentMode(p.payment_mode||"CASH");setPurchasePaymentNote(`Payment for ${p.purchase_no}`)}}>Pay Bill</button></div>)}{!purchases.some(p=>Number(p.due_amount||0)>0&&p.purchase_date<=procurementAsOnDate)&&<div className="empty">No outstanding supplier bills.</div>}</div></div>
      <div className="panel procurement-filters">
        <label>Purchase No.<input placeholder="Search purchase" value={procurementSearch} onChange={e=>setProcurementSearch(e.target.value)}/></label>
        <label>Supplier<select value={procurementSupplierFilter} onChange={e=>setProcurementSupplierFilter(e.target.value)}><option value="">All Suppliers</option>{suppliers.map(s=><option key={s.id} value={s.id}>{s.supplier_name}</option>)}</select></label>
        <label>Status<select value={procurementStatusFilter} onChange={e=>setProcurementStatusFilter(e.target.value)}><option value="">All Status</option><option value="PAID">Paid</option><option value="PARTIAL">Partially Paid</option><option value="DUE">Due</option></select></label>
        <label>From Date<input type="date" value={procurementDateFrom} onChange={e=>setProcurementDateFrom(e.target.value)}/></label>
        <label>To Date<input type="date" value={procurementDateTo} onChange={e=>setProcurementDateTo(e.target.value)}/></label>
        <button type="button" className="btn secondary filter-clear" onClick={()=>{setProcurementSearch("");setProcurementSupplierFilter("");setProcurementStatusFilter("");setProcurementDateFrom("");setProcurementDateTo("")}}>Clear</button>
      </div>
      <div className="panel"><div className="panel-title-row"><div><h3>Procurement Register</h3><small>{rows.length} purchases matching filters · up to {procurementAsOnDate}</small></div></div><Table><thead><tr><th>Purchase</th><th>Date</th><th>Supplier</th><th>Total</th><th>Paid</th><th>Due</th><th>Status</th><th>Audit</th></tr></thead><tbody>{rows.map(p=><tr key={p.id}>
        <td className="link" onClick={()=>{setEditingPurchase(p.id);setPurchaseDate(p.purchase_date);setPurchaseSupplier(String(p.supplier_id));setPurchaseItems((p.purchase_items||[]).map(x=>({item_id:String(x.item_id),rate:x.rate,qty:x.qty})));setPurchasePayment(p.payment_status);setPurchasePaid(p.paid_amount);setPurchaseReceiver(p.receiver_id?String(p.receiver_id):"");setPurchasePaymentMode(p.payment_mode||"CASH");setPurchaseTransport(p.transportation_charge||0);setPurchaseLoading(p.loading_charge||0);setPurchaseUnloading(p.unloading_charge||0);setPurchaseChargesPaidBy(p.charges_paid_by||"Business");setPurchaseChargesReceiver(p.charges_receiver_id?String(p.charges_receiver_id):"");go("purchase")}}>{p.purchase_no}</td>
        <td>{p.purchase_date}</td><td className="link" onClick={()=>{const s=suppliers.find(x=>x.id===Number(p.supplier_id));if(s){setEditingSupplier(s.id);setSupplierForm({supplier_name:s.supplier_name,mobile_no:s.mobile_no||"",address:s.address||"",opening_due:s.opening_due||0});setMasterTab("suppliers");setShowSupplierForm(true);go("master")}}}>{p.suppliers?.supplier_name}</td>
        <td>{money(p.total_amount)}</td><td>{money(p.paid_amount)}</td><td>{money(p.due_amount)}</td><td><Status status={p.payment_status}/></td>
        <td>{Number(p.due_amount)>0?<button className="small-btn primary" onClick={()=>{setPurchasePaymentId(p.id);setPurchasePaymentAmount("");setPurchasePaymentDate(today());setPurchasePaymentReceiver(p.receiver_id?String(p.receiver_id):"");setPurchasePaymentMode(p.payment_mode||"CASH");setPurchasePaymentNote(`Payment for ${p.purchase_no}`)}}>Payment</button>:<span className="status paid">Paid</span>}</td><td><button type="button" className="small-btn secondary" onClick={()=>setAuditTarget({table:"purchases",id:p.id,label:p.purchase_no})}>Audit</button></td>
      </tr>)}{!rows.length&&<Empty col="8" text="No purchases match the selected filters."/>}</tbody></Table></div>
      {purchasePaymentId&&<PurchasePaymentModal/>}
    </>
  }

  function Purchase(){
    return <><Header title={editingPurchase?"Edit Purchase":"New Purchase"}><button className="btn secondary nav-back" onClick={()=>{setEditingPurchase(null);go("procurement")}}>← Cancel</button></Header>
      <form className="panel" onSubmit={createPurchase}>
        <div className="grid-form">
          <label>Purchase Date<input type="date" value={purchaseDate} onChange={e=>setPurchaseDate(e.target.value)}/></label>
          <label>Supplier*<select value={purchaseSupplier} onChange={e=>setPurchaseSupplier(e.target.value)}><option value="">Select Supplier</option>{suppliers.map(s=><option key={s.id} value={s.id}>{s.supplier_name}</option>)}</select></label>
        </div>
        <div className="section-title"><div><span>Purchase Items</span><small>Add all items received from supplier</small></div><button type="button" className="small-btn" onClick={()=>setPurchaseItems([...purchaseItems,{item_id:"",rate:0,qty:1}])}>＋ Add Item</button></div>
        <Table><thead><tr><th>Item</th><th>Rate</th><th>Qty</th><th>Amount</th><th></th></tr></thead><tbody>{purchaseItems.map((x,i)=><tr key={i}><td><select value={x.item_id} onChange={e=>{const it=items.find(a=>a.id===Number(e.target.value));setPurchaseItems(prev=>prev.map((z,j)=>j===i?{...z,item_id:e.target.value,rate:it?.purchase_rate||0}:z))}}><option value="">Select Item</option>{items.map(a=><option key={a.id} value={a.id}>{a.item_name}</option>)}</select></td><td><input type="number" step="0.01" value={x.rate} onChange={e=>setPurchaseItems(prev=>prev.map((z,j)=>j===i?{...z,rate:e.target.value}:z))}/></td><td><input type="number" min="1" value={x.qty} onChange={e=>setPurchaseItems(prev=>prev.map((z,j)=>j===i?{...z,qty:e.target.value}:z))}/></td><td>{money(Number(x.rate)*Number(x.qty))}</td><td><button type="button" className="icon-btn" onClick={()=>setPurchaseItems(purchaseItems.length>1?purchaseItems.filter((_,j)=>j!==i):purchaseItems)}>×</button></td></tr>)}</tbody></Table>

        <div className="purchase-expense-box">
          <div className="section-title"><div><span>Optional Purchase Expenses</span><small>These are separate from supplier item value and appear in Expenses.</small></div></div>
          <div className="grid-form">
            <label>Transportation Charges<input type="number" min="0" step="0.01" value={purchaseTransport} onChange={e=>setPurchaseTransport(e.target.value)}/></label>
            <label>Loading Charges<input type="number" min="0" step="0.01" value={purchaseLoading} onChange={e=>setPurchaseLoading(e.target.value)}/></label>
            <label>Unloading Charges<input type="number" min="0" step="0.01" value={purchaseUnloading} onChange={e=>setPurchaseUnloading(e.target.value)}/></label>
            <label>Charges Paid By<select value={purchaseChargesPaidBy} onChange={e=>setPurchaseChargesPaidBy(e.target.value)}><option>Business</option><option>Supplier</option></select></label>
            {purchaseChargesPaidBy==="Business"&&<label>Paid From Receiver<select value={purchaseChargesReceiver} onChange={e=>setPurchaseChargesReceiver(e.target.value)}><option value="">Select Receiver</option>{receivers.map(r=><option key={r.id} value={r.id}>{r.receiver_name}</option>)}</select></label>}
          </div>
          <div className="expense-total-line"><span>Item Value</span><b>{money(purchaseItemsTotal)}</b><span>Additional Expenses</span><b>{money(purchaseChargesTotal)}</b></div>
        </div>

        <div className="sale-bottom"><div className="total">Supplier Total <b>{money(purchaseTotal)}</b></div><div className="payment-box"><label>Supplier Payment Status<select value={purchasePayment} onChange={e=>setPurchasePayment(e.target.value)}><option value="PAID">Paid</option><option value="PARTIAL">Partially Paid</option><option value="DUE">Due</option></select></label>{purchasePayment==="PARTIAL"&&<label>Paid Amount<input type="number" min="0" value={purchasePaid} onChange={e=>setPurchasePaid(e.target.value)}/></label>}{purchasePayment!=="DUE"&&<><label>Paid From Receiver<select value={purchaseReceiver} onChange={e=>setPurchaseReceiver(e.target.value)}><option value="">Select Receiver</option>{receivers.map(r=><option key={r.id} value={r.id}>{r.receiver_name}</option>)}</select></label><label>Paid As<select value={purchasePaymentMode} onChange={e=>setPurchasePaymentMode(e.target.value)}><option value="CASH">Cash</option><option value="PHONEPE">PhonePe</option></select></label></>}<div>Supplier Balance Due: <b>{money(dueForPurchase)}</b></div></div></div>
        <div className="form-actions"><button className="btn primary">{editingPurchase?"Update Purchase":"Save Purchase"}</button></div>
      </form>
    </>
  }
  function Master(){
    const masterOptions = [
      {id:"customers", label:"Customers", icon:"👥", count:customers.length},
      {id:"items", label:"Items", icon:"📦", count:items.length},
      {id:"receivers", label:"Receivers", icon:"💰", count:receivers.length},
      {id:"suppliers", label:"Suppliers", icon:"🏢", count:suppliers.length},
      {id:"expense_types", label:"Expense Types", icon:"🧾", count:expenseTypes.length},
      {id:"user_profiles", label:"User Profiles", icon:"👤", count:userProfiles.length}
    ];

    return <>
      <Header title="Master Data"/>
      <div className="master-layout">
        <aside className="master-sidebar">
          <div className="master-sidebar-title">Masters</div>
          <div className="master-sidebar-list">
            {masterOptions.map(m =>
              <button key={m.id} type="button"
                className={masterTab===m.id ? "master-side-btn active" : "master-side-btn"}
                onClick={()=>setMasterTab(m.id)}>
                <span className="master-side-icon">{m.icon}</span>
                <span className="master-side-label">{m.label}</span>
                <span className="master-side-count">{m.count}</span>
              </button>
            )}
          </div>
        </aside>

        <main className="master-content">
      {masterTab==="customers" && <div className="panel">
        <div className="toolbar master-toolbar">
          <div><h3>Customers</h3><small>Customer records</small></div>
          <div className="master-toolbar-actions"><input placeholder="Search name or mobile" value={customerSearch} onChange={e=>setCustomerSearch(e.target.value)}/><button className="small-btn primary" onClick={()=>{setEditingCustomer(null);setCustomerForm({...emptyCustomer});setShowCustomerForm(true)}}>＋ Add Customer</button></div>
        </div>
        <Table><thead><tr><th>Name</th><th>Mobile</th><th>Opening Due</th><th>Action</th></tr></thead>
          <tbody>
            {customers.filter(c=>`${c.customer_name} ${c.mobile_no||""}`.toLowerCase().includes(customerSearch.toLowerCase())).map(c=>
              <tr key={c.id}>
                <td className="link" onClick={()=>{setEditingCustomer(c.id);setCustomerForm({customer_name:c.customer_name,mobile_no:c.mobile_no||"",address:c.address||"",opening_due:c.opening_due});setShowCustomerForm(true)}}>{c.customer_name}</td><td>{c.mobile_no||"-"}</td><td>{money(c.opening_due)}</td>
                <td><span className="click-hint">Click name to edit</span></td>
              </tr>
            )}
            {!customers.length&&<Empty col="4" text="No customers yet."/>}
          </tbody>
        </Table>
      </div>}

      {masterTab==="items" && <div className="panel">
        <div className="toolbar master-toolbar">
          <div><h3>Items</h3><small>Item records and stock</small></div>
          <div className="master-toolbar-actions"><input placeholder="Search item or master/category" value={itemSearch} onChange={e=>setItemSearch(e.target.value)}/><button className="small-btn primary" onClick={()=>{setEditingItem(null);setItemForm({...emptyItem});setShowItemForm(true)}}>＋ Add Item</button></div>
        </div>
        <Table><thead><tr><th>Master / Category</th><th>Item Name</th><th>Sale Rate</th><th>Purchase Rate</th><th>Stock</th><th>Action</th></tr></thead>
          <tbody>
            {items.filter(it=>`${it.master_name||""} ${it.item_name||""}`.toLowerCase().includes(itemSearch.toLowerCase())).map(it=>
              <tr key={it.id}>
                <td>{it.master_name||"-"}</td><td>{it.item_name}</td><td>{money(it.sale_rate)}</td><td>{money(it.purchase_rate)}</td><td>{Number(stockMap[it.id]||0).toLocaleString("en-IN")}</td>
                <td>
                  <button className="text-btn" onClick={()=>{setEditingItem(it.id);setItemForm({master_name:it.master_name||"",item_name:it.item_name||"",sale_rate:it.sale_rate||0,purchase_rate:it.purchase_rate||0,opening_stock:it.opening_stock||0,minimum_stock:it.minimum_stock||0});setShowItemForm(true)}}>Edit</button>
                  <button className="text-btn danger" onClick={()=>deleteItem(it.id)}>Delete</button>
                </td>
              </tr>
            )}
            {!items.length&&<Empty col="6" text="No items yet."/>}
          </tbody>
        </Table>
      </div>}

      {masterTab==="receivers" && <div className="panel">
        <div className="toolbar master-toolbar">
          <div><h3>Receivers</h3><small>Cash and bank receivers</small></div>
          <button className="small-btn primary" onClick={()=>{setEditingReceiver(null);setReceiverForm({...emptyReceiver});setShowReceiverForm(true)}}>＋ Add Receiver</button>
        </div>
        <Table><thead><tr><th>Name</th><th>Type</th><th>Opening Balance</th><th>Current Balance</th><th>Action</th></tr></thead>
          <tbody>
            {receivers.map(r=><tr key={r.id}>
              <td>{r.receiver_name}</td><td>{r.receiver_type}</td><td>{money(r.opening_balance)}</td><td>{money(r.current_balance)}</td>
              <td><button className="text-btn" onClick={()=>{setEditingReceiver(r.id);setReceiverForm({receiver_name:r.receiver_name,receiver_type:r.receiver_type||"Cash",opening_balance:r.opening_balance||0,current_balance:r.current_balance||0});setShowReceiverForm(true)}}>Edit</button></td>
            </tr>)}
            {!receivers.length&&<Empty col="5" text="No receivers yet."/>}
          </tbody>
        </Table>
      </div>}

      {masterTab==="suppliers" && <div className="panel">
        <div className="toolbar master-toolbar">
          <div><h3>Suppliers</h3><small>Supplier records</small></div>
          <div className="master-toolbar-actions"><input placeholder="Search supplier or mobile" value={customerSearch} onChange={e=>setCustomerSearch(e.target.value)}/><button className="small-btn primary" onClick={()=>{setEditingSupplier(null);setSupplierForm({...emptySupplier});setShowSupplierForm(true)}}>＋ Add Supplier</button></div>
        </div>
        <Table><thead><tr><th>Name</th><th>Mobile</th><th>Opening Due</th><th>Action</th></tr></thead>
          <tbody>
            {suppliers.filter(s=>`${s.supplier_name} ${s.mobile_no||""}`.toLowerCase().includes(customerSearch.toLowerCase())).map(s=><tr key={s.id}>
              <td className="link" onClick={()=>{setEditingSupplier(s.id);setSupplierForm({supplier_name:s.supplier_name,mobile_no:s.mobile_no||"",address:s.address||"",opening_due:s.opening_due||0});setShowSupplierForm(true)}}>{s.supplier_name}</td><td>{s.mobile_no||"-"}</td><td>{money(s.opening_due)}</td>
              <td><span className="click-hint">Click name to edit</span></td>
            </tr>)}
            {!suppliers.length&&<Empty col="4" text="No suppliers yet."/>}
          </tbody>
        </Table>
      </div>}


      {masterTab==="expense_types" && <div className="panel">
        <div className="toolbar master-toolbar">
          <div><h3>Expense Types</h3><small>Types used by the Expenses module</small></div>
          <button className="small-btn primary" onClick={()=>{setEditingExpenseType(null);setExpenseTypeForm({type_name:"",description:""});setShowExpenseTypeForm(true)}}>＋ Add Expense Type</button>
        </div>
        <Table><thead><tr><th>Expense Type</th><th>Description</th><th>Action</th></tr></thead><tbody>{expenseTypes.map(t=><tr key={t.id}><td>{t.type_name}</td><td>{t.description||"-"}</td><td><button className="text-btn" onClick={()=>{setEditingExpenseType(t.id);setExpenseTypeForm({type_name:t.type_name,description:t.description||""});setShowExpenseTypeForm(true)}}>Edit</button></td></tr>)}{!expenseTypes.length&&<Empty col="3" text="No expense types yet. Add one to use Expenses."/>}</tbody></Table>
      </div>}

      {masterTab==="user_profiles" && <div className="panel">
        <div className="panel-title-row"><div><h3>User Profiles</h3><small>Role and receiver mapping for Supabase login accounts</small></div></div>
        <div className="user-profile-note">Create the login account first in Supabase Authentication. Then add/update its profile using the SQL shown in <b>supabase/auth_setup.sql</b>. This screen is read-only so passwords are never stored in the application database.</div>
        <Table><thead><tr><th>User</th><th>Role</th><th>Receiver</th><th>Status</th></tr></thead><tbody>{userProfiles.map(u=><tr key={u.id}><td><b>{u.full_name}</b><small className="muted-block">{u.email||u.id}</small></td><td><span className={u.role==="admin"?"role-badge admin":"role-badge receiver"}>{u.role}</span></td><td>{u.receivers?.receiver_name||"-"}</td><td>{u.status?"Active":"Inactive"}</td></tr>)}{!userProfiles.length&&<Empty col="4" text="No user profiles configured yet."/>}</tbody></Table>
      </div>}
        </main>
      </div>

      {showCustomerForm&&CustomerForm()}{showItemForm&&ItemForm()}{showReceiverForm&&ReceiverForm()}{showSupplierForm&&SupplierForm()}{showExpenseTypeForm&&ExpenseTypeForm()}
    </>
  }

  function MasterCard({title,count,button,onClick,onAdd,active}){return <div className={active?"master-card active":"master-card"} onClick={onClick} role="button" tabIndex={0} onKeyDown={e=>{if(e.key==="Enter"||e.key===" ")onClick()}}><h3>{title}</h3><strong>{count}</strong><span>Records</span><button type="button" className="btn primary" onClick={e=>{e.stopPropagation();onAdd()}}>{button}</button></div>}

  function Reports(){
    const from=reportDateFrom||"0000-01-01";
    const to=reportDateTo||today();
    const q=String(reportSearch||"").trim().toLowerCase();
    const inRange=(date)=>!!date && date>=from && date<=to;
    const dueRows=sales.filter(s=>Number(s.due_amount)>0&&s.invoice_date<=to&&(!q||String(s.invoice_no||"").toLowerCase().includes(q)||String(s.customers?.customer_name||"").toLowerCase().includes(q)));
    const reportSales=sales.filter(s=>inRange(s.invoice_date)&&(!q||String(s.invoice_no||"").toLowerCase().includes(q)||String(s.customers?.customer_name||"").toLowerCase().includes(q)));
    const reportCollections=collections.filter(c=>inRange(c.collection_date)&&(!q||String(c.collection_no||"").toLowerCase().includes(q)||String(c.customers?.customer_name||"").toLowerCase().includes(q)));
    const reportStock=items.map(it=>({it,qty:stockTxns.filter(t=>t.item_id===it.id&&t.transaction_date<=to).reduce((a,t)=>a+Number(t.qty_in||0)-Number(t.qty_out||0),Number(it.opening_stock||0))}));
    const reportOptions=[
      {id:"invoices",label:"Invoice Report",icon:"🧾"},
      {id:"stock",label:"Stock Report",icon:"📦"},
      {id:"collections",label:"Collection Report",icon:"💰"},
      {id:"dues",label:"Due Report",icon:"⚠️"}
    ];
    function downloadReportPdf(){
      const doc=new jsPDF(); const title=reportOptions.find(x=>x.id===reportTab)?.label||"Report";
      doc.setFontSize(16);doc.text(`B REDDY SALES - ${title}`,14,16);doc.setFontSize(9);doc.text(`From: ${reportDateFrom||"-"} | To: ${reportDateTo||today()}`,14,23);
      let y=32;
      const rows=reportTab==="invoices"?reportSales.map(x=>[x.invoice_no,x.customers?.customer_name||"-",x.invoice_date,money(x.total_amount),money(x.paid_amount),money(x.due_amount)])
        :reportTab==="collections"?reportCollections.map(x=>[x.collection_no,x.collection_date,x.customers?.customer_name||"-",x.receivers?.receiver_name||"-",x.payment_mode==="PHONEPE"?"PhonePe":"Cash",money(x.total_amount),x.remarks||"-"])
        :reportTab==="stock"?reportStock.map(x=>[x.it.master_name||"-",x.it.item_name,String(x.qty),money(x.it.sale_rate)])
        :dueRows.map(x=>[x.invoice_no,x.customers?.customer_name||"-",x.invoice_date,money(x.total_amount),money(x.due_amount)]);
      const heads=reportTab==="invoices"?["Invoice","Customer","Date","Amount","Paid","Due"]:reportTab==="collections"?["Collection","Date","Customer","Receiver","Received As","Amount","Remarks"]:reportTab==="stock"?["Master","Item","Stock","Sale Rate"]:["Invoice","Customer","Date","Amount","Due"];
      doc.setFont("helvetica","bold");doc.text(heads.join(" | "),14,y);y+=7;doc.setFont("helvetica","normal");
      rows.forEach(r=>{const line=r.join(" | ");const wrapped=doc.splitTextToSize(line,180);if(y+wrapped.length*5>285){doc.addPage();y=18;doc.setFont("helvetica","bold");doc.text(heads.join(" | "),14,y);y+=7;doc.setFont("helvetica","normal")}doc.text(wrapped,14,y);y+=Math.max(5,wrapped.length*5)});
      doc.save(`${title.replace(/\s+/g,"-").toLowerCase()}-${reportDateTo||today()}.pdf`);
    }
    return <>
      <Header title="Reports"/>
      <div className="panel report-toolbar-panel">
        <div className="report-toolbar-top"><div className="report-tabs">{reportOptions.map(r=><button key={r.id} type="button" className={reportTab===r.id?"period-btn active":"period-btn"} onClick={()=>setReportTab(r.id)}>{r.icon} {r.label}</button>)}</div><div className="report-actions"><button type="button" className="btn secondary" onClick={()=>{setReportDateFrom("");setReportDateTo(today());setReportSearch("")}}>Clear</button><button type="button" className="btn secondary" onClick={downloadReportPdf}>⬇ Download PDF</button></div></div>
        <div className="report-filter-inline"><span className="filter-kicker">{reportOptions.find(r=>r.id===reportTab)?.label||"Report"} Filters</span><label>From Date<input type="date" value={reportDateFrom} onChange={e=>setReportDateFrom(e.target.value)}/></label><label>To Date<input type="date" value={reportDateTo} onChange={e=>setReportDateTo(e.target.value)}/></label><label className="report-search-field">Search<input placeholder={reportTab==="collections"?"Collection no. / customer":reportTab==="stock"?"Item / master":"Invoice no. / customer"} value={reportSearch} onChange={e=>setReportSearch(e.target.value)}/></label></div>
      </div>
      <div className="reports-content-full">
        {reportTab==="invoices"&&<div className="panel"><div className="report-heading"><div><h3>Invoice Report</h3><small>{reportSales.length} invoices</small></div></div><Table><thead><tr><th>Invoice</th><th>Customer</th><th>Date</th><th>Amount</th><th>Paid</th><th>Due</th><th>Status</th></tr></thead><tbody>{reportSales.map(s=><tr key={s.id}><td className="link" onClick={()=>{setSelectedInvoice(s);go("invoice-detail")}}>{s.invoice_no}</td><td>{s.customers?.customer_name||"-"}</td><td>{s.invoice_date}</td><td>{money(s.total_amount)}</td><td>{money(s.paid_amount)}</td><td>{money(s.due_amount)}</td><td><Status status={s.payment_status}/></td></tr>)}{!reportSales.length&&<Empty col="7" text="No invoices for selected period."/>}</tbody></Table></div>}
        {reportTab==="stock"&&<div className="panel"><div className="report-heading"><div><h3>Stock Report</h3><small>Stock as on {reportDateTo||today()}</small></div></div><Table><thead><tr><th>Item</th><th>Opening Stock</th><th>Purchases</th><th>Sales</th><th>Available Stock</th></tr></thead><tbody>{reportStock.map(({it,qty})=>{const tx=stockTxns.filter(t=>t.item_id===it.id&&t.transaction_date<=to);return <tr key={it.id}><td>{it.item_name}</td><td>{it.opening_stock}</td><td>{tx.reduce((a,t)=>a+Number(t.qty_in||0),0)}</td><td>{tx.reduce((a,t)=>a+Number(t.qty_out||0),0)}</td><td><b>{qty}</b></td></tr>})}{!reportStock.length&&<Empty col="5" text="No stock items."/>}</tbody></Table></div>}
        {reportTab==="collections"&&<div className="panel"><div className="report-heading"><div><h3>Collection Report</h3><small>{reportCollections.length} collections</small></div></div><Table><thead><tr><th>Collection No.</th><th>Date</th><th>Customer</th><th>Receiver</th><th>Received As</th><th>Amount</th><th>Remarks</th></tr></thead><tbody>{reportCollections.map(c=><tr key={c.id}><td className="link" onClick={()=>editCollection(c)}>{c.collection_no||"-"}</td><td>{c.collection_date}</td><td>{c.customers?.customer_name||"-"}</td><td>{c.receivers?.receiver_name||"-"}</td><td>{c.payment_mode==="PHONEPE"?"PhonePe":"Cash"}</td><td>{money(c.total_amount)}</td><td>{c.remarks||"-"}</td></tr>)}{!reportCollections.length&&<Empty col="7" text="No collections for selected period."/>}</tbody></Table></div>}
        {reportTab==="dues"&&<div className="panel"><div className="report-heading"><div><h3>Due Report</h3><small>Outstanding dues up to {reportDateTo||today()}</small></div></div><Table><thead><tr><th>Invoice</th><th>Customer</th><th>Date</th><th>Amount</th><th>Due</th><th>Age</th></tr></thead><tbody>{dueRows.map(s=>{const age=Math.max(0,Math.floor((new Date(to)-new Date(s.invoice_date))/86400000));return <tr key={s.id}><td className="link" onClick={()=>{setSelectedInvoice(s);go("invoice-detail")}}>{s.invoice_no}</td><td>{s.customers?.customer_name||"-"}</td><td>{s.invoice_date}</td><td>{money(s.total_amount)}</td><td>{money(s.due_amount)}</td><td>{age} days</td></tr>})}{!dueRows.length&&<Empty col="6" text="No dues."/>}</tbody></Table></div>}
      </div>
    </>
  }


  function AuditModal(){
    if(!auditTarget) return null;
    const rows=auditLogs.filter(x=>x.table_name===auditTarget.table && Number(x.record_id)===Number(auditTarget.id));
    return <div className="modal-backdrop">
      <div className="modal audit-modal">
        <div className="modal-head"><div><h3>Audit Trail — {auditTarget.label}</h3><small>Only changes related to this transaction</small></div><button type="button" onClick={()=>setAuditTarget(null)}>×</button></div>
        <Table><thead><tr><th>Date & Time</th><th>User</th><th>Role</th><th>Action</th><th>Details</th></tr></thead>
          <tbody>{rows.map(x=><tr key={x.id}><td>{new Date(x.created_at).toLocaleString("en-IN")}</td><td>{x.user_name||"System"}</td><td>{x.user_role||"System"}</td><td><span className="audit-action">{x.action}</span></td><td>{typeof x.details==="object"?JSON.stringify(x.details):x.details||"-"}</td></tr>)}{!rows.length&&<Empty col="5" text="No audit history found for this transaction."/>}</tbody>
        </Table>
      </div>
    </div>;
  }

  if(authLoading) return <div className="auth-screen"><div className="auth-card"><div className="brand auth-brand">B REDDY SALES<span>Retail Management</span></div><div className="loading">Checking login…</div></div></div>;
  if(!sessionUser || !profile) return <LoginScreen
    loginRole={loginRole}
    setLoginRole={setLoginRole}
    notice={notice}
    loginForm={loginForm}
    setLoginForm={setLoginForm}
    handleLogin={handleLogin}
    loginBusy={loginBusy}
  />;
  if (loading) return <div className="loading">Loading B Reddy Sales…</div>;
  return <><style jsx global>{`
*{box-sizing:border-box}.mobile-menu-btn,.mobile-close,.mobile-overlay{display:none}
.dashboard-period-single{display:grid;grid-template-columns:minmax(220px,1fr) auto;align-items:center;gap:18px}.dashboard-period-single h3{margin:4px 0}.filter-kicker,.eyebrow{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;opacity:.65}.period-note{grid-column:1/-1;opacity:.65}.period-buttons.large{display:flex;gap:6px}.period-buttons.large .period-btn{min-width:92px}
.expense-filter-panel .filter-title,.purchase-bill-filter,.payment-page-intro{display:flex;align-items:center;justify-content:space-between;gap:16px}.filter-title small{display:block;opacity:.65;margin-top:3px}.filter-grid{display:grid;gap:12px;margin-top:16px}.expense-filter-grid{grid-template-columns:2fr repeat(6,minmax(120px,1fr))}.expense-filter-grid .filter-search{min-width:240px}
.payment-page-intro{background:linear-gradient(135deg,#f7faff,#fff)}.payment-page-intro h2{margin:4px 0}.payment-page-intro p{margin:0;opacity:.7}.payment-total-due{padding:14px 18px;border:1px solid #d9e3f2;border-radius:14px;text-align:right}.payment-total-due small{display:block;opacity:.65}.payment-total-due strong{font-size:24px}.purchase-bill-filter{margin-top:12px}.purchase-bill-filter label{flex:1;max-width:620px}.purchase-bill-filter>span{font-weight:700;opacity:.7}.purchase-bill-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:14px}.purchase-bill-card{background:#fff;border:1px solid #dbe4f0;border-radius:16px;padding:18px;box-shadow:0 4px 18px rgba(30,60,100,.06)}.purchase-bill-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.purchase-bill-head h3{margin:3px 0}.purchase-bill-head small{opacity:.65}.bill-label{font-size:10px;font-weight:800;letter-spacing:.08em;color:#2563eb}.purchase-bill-supplier{margin:18px 0;padding:12px;background:#f7f9fc;border-radius:10px}.purchase-bill-supplier span{display:block;font-size:11px;opacity:.6}.purchase-bill-amounts{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.purchase-bill-amounts div{padding:10px;border:1px solid #e5eaf1;border-radius:10px}.purchase-bill-amounts small{display:block;opacity:.6}.purchase-bill-amounts b{display:block;margin-top:4px}.due-value{color:#dc2626}.purchase-bill-actions{display:flex;gap:8px;margin-top:16px}.purchase-bill-actions .btn{flex:1}
.cost-picker-button{width:100%;min-height:42px;padding:8px 10px;border:1px solid #cbd5e1;background:#fff;border-radius:8px;display:flex;align-items:center;justify-content:space-between;text-align:left;cursor:pointer}.cost-picker-button.selected{border-color:#2563eb;background:#f8fbff}.modal-backdrop{position:fixed!important;inset:0!important;z-index:5000!important;display:flex;align-items:center;justify-content:center;background:rgba(15,23,42,.58)}.modal-backdrop .modal{position:relative;z-index:5001}.purchase-rate-modal{max-width:760px}.rate-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:14px 0}.rate-summary div{padding:12px;border:1px solid #dce5f0;border-radius:10px;background:#f8fafc}.rate-summary span{display:block;font-size:11px;opacity:.6}.rate-summary b{display:block;margin-top:4px}.rate-list{display:grid;gap:10px;max-height:48vh;overflow:auto}.rate-lot{border:1px solid #d8e2ef;background:#fff;border-radius:12px;padding:13px;text-align:left;cursor:pointer}.rate-lot:hover,.rate-lot.selected{border-color:#2563eb;background:#f7faff}.rate-lot-top,.rate-lot-meta{display:flex;justify-content:space-between;gap:12px}.rate-lot-meta{margin-top:7px;font-size:12px;opacity:.7}.header-title{display:flex;align-items:center;gap:10px}
.metric-card{background:#fff;border:1px solid #e3e9f2;border-left:4px solid #2563eb;border-radius:14px;padding:16px 14px;box-shadow:0 3px 12px rgba(30,60,100,.05)}.metric-card.sales{border-left-color:#2563eb}.metric-card.collections{border-left-color:#16a34a}.metric-card.profit{border-left-color:#dc2626}.metric-card.due{border-left-color:#ef4444}.dashboard-metric-cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px}.metric-card-top{display:flex;align-items:center;justify-content:space-between;gap:8px}.metric-card-top>span{font-size:12px;font-weight:800}.metric-card>strong{display:block;font-size:24px;margin-top:12px}.metric-periods{display:flex;border:1px solid #dbe3ee;border-radius:8px;overflow:hidden}.metric-periods button{border:0;background:#fff;padding:4px 7px;font-size:10px;font-weight:800;cursor:pointer}.metric-periods button+button{border-left:1px solid #dbe3ee}.metric-periods button.active{background:#2563eb;color:#fff}.customer-payment-head{display:flex;align-items:center;justify-content:space-between;gap:16px}.customer-payment-head h2{margin:4px 0}.customer-payment-head p{margin:0;opacity:.65}.old-due-row{display:grid;grid-template-columns:minmax(220px,300px) 1fr;gap:14px;margin-top:16px}.procurement-payment-strip{background:linear-gradient(135deg,#f7faff,#fff)}.procurement-payment-strip .panel-title-row>strong{font-size:24px}.due-bill-list{display:grid;gap:8px;margin-top:12px}.due-bill-row{display:grid;grid-template-columns:1fr 150px 110px;align-items:center;gap:12px;padding:10px 12px;border:1px solid #e3e9f2;border-radius:10px;background:#fff}.due-bill-row span,.due-bill-row small{display:block;opacity:.65;font-size:11px}.due-bill-row strong{display:block}.report-toolbar-panel{padding:14px}.report-toolbar-top{display:flex;align-items:center;justify-content:space-between;gap:12px}.report-actions{display:flex;gap:8px}.report-filter-inline{display:grid;grid-template-columns:130px 170px 170px minmax(220px,1fr);align-items:end;gap:10px;margin-top:12px;padding-top:12px;border-top:1px solid #edf1f6}.report-filter-inline .filter-kicker{align-self:center}.report-search-field{min-width:0}.profile-wrap{position:relative}.profile-avatar{width:38px;height:38px;border-radius:50%;border:2px solid #d7e2f0;background:#fff;color:#1e3a8a;font-weight:800;cursor:pointer}.profile-backdrop{position:fixed;inset:0;z-index:4100}.profile-menu{position:absolute;right:0;top:46px;width:300px;background:#fff;border:1px solid #dbe4ef;border-radius:14px;box-shadow:0 18px 45px rgba(15,23,42,.18);z-index:4101;overflow:hidden}.profile-menu-user{display:flex;gap:12px;padding:16px;border-bottom:1px solid #edf1f5}.profile-menu-avatar{width:44px;height:44px;border-radius:50%;background:#eaf2ff;display:flex;align-items:center;justify-content:center;font-weight:800;color:#1d4ed8}.profile-menu-user b,.profile-menu-user small,.profile-menu-user span{display:block}.profile-menu-user small{font-size:12px;opacity:.65;margin-top:2px;word-break:break-all}.profile-menu-user span{font-size:11px;color:#2563eb;margin-top:5px;font-weight:700}.profile-signout{width:100%;padding:13px 16px;text-align:left;border:0;background:#fff;color:#b91c1c;font-weight:700;cursor:pointer}.profile-signout:hover{background:#fff5f5}.sale-details{grid-template-columns:repeat(4,minmax(0,1fr));align-items:end}.sale-panel{max-width:1250px;margin:0 auto}.purchase-rate-modal .rate-lot{display:block;width:100%}.rate-lot-main{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.rate-lot-main span{display:block}.rate-lot-main small{display:block;opacity:.65;margin-top:3px}.rate-lot-main b{white-space:nowrap}.expense-filter-grid{grid-template-columns:minmax(220px,2fr) repeat(5,minmax(120px,1fr))}.expense-filter-grid .filter-search{min-width:0}

@media(max-width:900px){.dashboard-metric-cards{grid-template-columns:repeat(2,minmax(0,1fr))}.report-toolbar-top{align-items:flex-start;flex-direction:column}.report-actions{width:100%}.report-actions .btn{flex:1}.report-filter-inline{grid-template-columns:1fr 1fr}.report-filter-inline .filter-kicker{grid-column:1/-1}.due-bill-row{grid-template-columns:1fr 110px}.due-bill-row .small-btn{grid-column:1/-1}.old-due-row{grid-template-columns:1fr}.profile-menu{position:fixed;right:12px;top:62px;width:min(300px,calc(100vw - 24px))}.mobile-menu-btn{display:inline-flex;width:40px;height:40px;align-items:center;justify-content:center;border:1px solid #d8e1ee;background:#fff;border-radius:10px;font-size:20px}.mobile-overlay{position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:3998}.mobile-overlay.open{display:block}.sidebar{position:fixed;left:0;top:0;bottom:0;width:280px;z-index:3999;transform:translateX(-105%);transition:transform .2s ease;box-shadow:10px 0 30px rgba(0,0,0,.18)}.sidebar.mobile-open{transform:translateX(0)}.mobile-close{display:block;position:absolute;right:8px;top:8px;border:0;background:transparent;color:#fff;font-size:26px}.main{margin-left:0!important;width:100%}.dashboard-period-single{grid-template-columns:1fr}.period-buttons.large{width:100%}.period-buttons.large .period-btn{flex:1}.expense-filter-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.expense-filter-grid .filter-search{grid-column:1/-1;min-width:0}.purchase-bill-grid{grid-template-columns:1fr}.purchase-bill-filter{flex-wrap:wrap}.purchase-bill-filter label{max-width:none;width:100%}.rate-summary{grid-template-columns:1fr}.purchase-rate-modal{width:min(96vw,760px)}.purchase-bill-amounts{grid-template-columns:1fr}.purchase-bill-actions{flex-direction:column}}
@media(max-width:600px){.dashboard-metric-cards{grid-template-columns:1fr}.metric-card>strong{font-size:22px}.metric-periods button{padding:4px 6px}.customer-payment-head{align-items:flex-start;flex-direction:column}.report-filter-inline{grid-template-columns:1fr}.report-filter-inline .filter-kicker{grid-column:auto}.report-tabs{display:grid!important;grid-template-columns:1fr 1fr;width:100%}.report-tabs .period-btn{min-height:40px}.due-bill-row{grid-template-columns:1fr}.header h1{font-size:22px}.header-right{flex:1;justify-content:flex-end}.btn{min-height:40px}.cards{grid-template-columns:1fr 1fr!important}.expense-filter-grid{grid-template-columns:1fr}.expense-filter-grid .filter-search{grid-column:auto}.panel{border-radius:12px}.table-wrap{overflow-x:auto}.modal{width:calc(100vw - 24px)!important;max-height:90vh;overflow:auto}}
`}</style><div className="app"><Sidebar/><main className="main">{notice&&<div className="notice" style={{position:"fixed",top:"18px",right:"18px",left:"auto",zIndex:3000,maxWidth:"min(620px,calc(100vw - 36px))",whiteSpace:"normal"}}>{notice}</div>}{screen==="dashboard"&&Dashboard()}{screen==="create-sale"&&CreateSale()}{screen==="sales"&&Sales()}{screen==="customers"&&Customers()}{screen==="customer-detail"&&CustomerDetail()}{screen==="invoice-detail"&&InvoiceDetail()}{screen==="collections"&&Collections()}{screen==="customer-payment"&&CustomerPayment()}{screen==="stock"&&Stock()}{screen==="procurement"&&Procurement()}{screen==="purchase"&&Purchase()}{screen==="expenses"&&Expenses()}{screen==="reports"&&Reports()}{screen==="master"&&Master()}</main></div>{openCostPicker!==null&&<PurchaseRateModal index={openCostPicker}/>} {auditTarget&&<AuditModal/>}</>;
}
