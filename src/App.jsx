import { useState, useEffect, useCallback } from "react";
import { supabase } from "./lib/supabase";

// ─── Constants ────────────────────────────────────────────────────────────────
const GRADES = ["KG A","KG B","Grade 1","Grade 2","Grade 3","Grade 4","Grade 5","Grade 6"];
const METHODS = { cash:"Cash", bank:"Bank transfer", mobile:"Mobile payment" };
const CATS = { tuition:"Tuition", activity:"Activity", transport:"Transport", meals:"Meals", uniform:"Uniform", other:"Other" };
const TERMS = ["Term 1","Term 2","Term 3","Annual","Monthly"];
const G = { g1:"#1B3A0C",g2:"#2E5818",g3:"#4A7C2F",g5:"#F0F8E8",amber:"#9E6B08",amberBg:"#FEF6E0",red:"#B91C1C",redBg:"#FEF2F2",blue:"#1E40AF",blueBg:"#EFF6FF",bg:"#F5F5F0",surface:"#FFFFFF",border:"#E0E0D4",text:"#18181A",muted:"#6B6B60" };

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = n => "XAF " + Math.round(parseFloat(n||0)).toLocaleString();
const today = () => new Date().toISOString().slice(0,10);
const inits = s => (s.first_name?.[0]||"")+(s.last_name?.[0]||"");

// ─── UI Primitives ────────────────────────────────────────────────────────────
const inp = { width:"100%", padding:"8px 10px", border:`1px solid ${G.border}`, borderRadius:7, fontSize:13, fontFamily:"inherit", background:G.surface, color:G.text, boxSizing:"border-box" };
const th  = { textAlign:"left", padding:"8px 12px", fontSize:11, fontWeight:600, color:G.muted, borderBottom:`1px solid ${G.border}`, background:G.bg, textTransform:"uppercase", letterSpacing:"0.04em" };
const td  = { padding:"9px 12px", borderBottom:`1px solid ${G.border}`, fontSize:13, color:G.text };

function Badge({ color, children }) {
  const m = { green:{bg:G.g5,tc:G.g2}, amber:{bg:G.amberBg,tc:G.amber}, red:{bg:G.redBg,tc:G.red}, blue:{bg:G.blueBg,tc:G.blue}, gray:{bg:"#F0F0E8",tc:G.muted} }[color]||{bg:"#F0F0E8",tc:G.muted};
  return <span style={{ display:"inline-block", padding:"2px 8px", borderRadius:20, fontSize:11, fontWeight:600, background:m.bg, color:m.tc }}>{children}</span>;
}

function Btn({ onClick, variant="default", size="md", disabled, children, style={} }) {
  const base = { padding:size==="sm"?"4px 10px":"7px 14px", fontSize:size==="sm"?12:13, borderRadius:7, border:`1px solid ${G.border}`, cursor:disabled?"not-allowed":"pointer", fontWeight:500, opacity:disabled?0.5:1, ...style };
  const vars = { default:{background:G.surface,color:G.text}, primary:{background:G.g2,color:"#fff",border:G.g2}, amber:{background:G.amber,color:"#fff",border:G.amber}, danger:{background:G.red,color:"#fff",border:G.red} };
  return <button style={{...base,...(vars[variant]||vars.default)}} onClick={disabled?undefined:onClick} disabled={disabled}>{children}</button>;
}

function Input(props) { return <input style={inp} {...props} />; }
function Sel({ children, ...props }) { return <select style={inp} {...props}>{children}</select>; }
function FG({ label, children, full }) { return <div style={full?{gridColumn:"1/-1"}:{}}><label style={{fontSize:11,fontWeight:600,color:G.muted,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:3,display:"block"}}>{label}</label>{children}</div>; }
function FormGrid({ children }) { return <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:0}}>{children}</div>; }

function Spinner() { return <div style={{display:"inline-block",width:14,height:14,border:"2px solid rgba(255,255,255,0.3)",borderTop:"2px solid #fff",borderRadius:"50%",animation:"spin 0.7s linear infinite"}}></div>; }

function Modal({ open, onClose, title, size="md", footer, children }) {
  if (!open) return null;
  const w = { sm:400, md:540, lg:700 }[size];
  return (
    <div onClick={e=>{if(e.target===e.currentTarget)onClose()}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:G.surface,borderRadius:12,width:w,maxWidth:"95vw",maxHeight:"92vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,.3)"}}>
        <div style={{padding:"15px 18px 12px",borderBottom:`1px solid ${G.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,background:G.surface,zIndex:1}}>
          <div style={{fontFamily:"Georgia,serif",fontSize:16,fontWeight:"bold",color:G.g1}}>{title}</div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:G.muted,lineHeight:1}}>×</button>
        </div>
        <div style={{padding:18}}>{children}</div>
        {footer && <div style={{padding:"12px 18px",borderTop:`1px solid ${G.border}`,background:G.bg,display:"flex",gap:8,justifyContent:"flex-end"}}>{footer}</div>}
      </div>
    </div>
  );
}

function Card({ children, style={} }) { return <div style={{background:G.surface,border:`1px solid ${G.border}`,borderRadius:10,overflow:"hidden",marginBottom:14,...style}}>{children}</div>; }
function CardHeader({ children, action }) { return <div style={{padding:"11px 14px",borderBottom:`1px solid ${G.border}`,fontWeight:600,fontSize:13,background:G.bg,display:"flex",alignItems:"center",justifyContent:"space-between"}}><span>{children}</span>{action}</div>; }

function Progress({ value, color=G.g3 }) { return <div style={{height:4,background:G.border,borderRadius:2,overflow:"hidden",marginTop:5}}><div style={{height:"100%",borderRadius:2,background:color,width:`${Math.min(100,Math.max(0,value||0))}%`}}/></div>; }

function StatCard({ label, value, color=G.text, progress, sub }) {
  return (
    <div style={{background:G.surface,border:`1px solid ${G.border}`,borderRadius:10,padding:"14px 16px"}}>
      <div style={{fontSize:11,color:G.muted,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:5}}>{label}</div>
      <div style={{fontSize:22,fontWeight:700,color}}>{value}</div>
      {progress!=null && <><Progress value={progress} color={progress>80?G.g3:progress>50?G.amber:G.red}/><div style={{fontSize:11,color:G.muted,marginTop:4}}>{progress}% collected</div></>}
      {sub && <div style={{fontSize:11,color:G.muted,marginTop:3}}>{sub}</div>}
    </div>
  );
}

// ─── Receipt Component ────────────────────────────────────────────────────────
function Receipt({ payment, student, balance }) {
  const rows = [
    ["Student", student ? `${student.first_name} ${student.last_name}` : "—"],
    ["Student ID", student?.student_code || "—"],
    ["Class", student?.grade || "—"],
    ["Fee", payment.fee_name || "General payment"],
    ["Payment method", METHODS[payment.method] || payment.method],
    ["Date", payment.payment_date || payment.date],
    ["Received by", payment.received_by || "Admin"],
    ...(payment.notes ? [["Notes", payment.notes]] : []),
  ];
  const whatsappText = `*GRATITUDE BILINGUAL NURSERY & PRIMARY SCHOOL*\nPayment Receipt ✅\nReceipt: ${payment.receipt_number}\n\nStudent: ${student?.first_name} ${student?.last_name}\nID: ${student?.student_code}\nClass: ${student?.grade}\nFee: ${payment.fee_name||"General"}\nDate: ${payment.payment_date||payment.date}\nMethod: ${METHODS[payment.method]||payment.method}\n\n*Amount paid: ${fmt(payment.amount_paid)}*\nBalance remaining: ${fmt(balance)}\n\n_Gratitude Bilingual Nursery — Official Receipt_`;
  return (
    <div>
      <div style={{border:`2px dashed ${G.border}`,borderRadius:10,padding:20,background:"#FAFAF6"}}>
        <div style={{textAlign:"center",marginBottom:16}}>
          <div style={{fontFamily:"Georgia,serif",fontSize:20,fontWeight:"bold",color:G.g1}}>Gratitude School</div>
          <div style={{fontSize:12,color:G.muted,marginBottom:10}}>Official Payment Receipt</div>
          <span style={{display:"inline-block",background:G.g5,color:G.g2,fontSize:12,fontWeight:700,padding:"4px 14px",borderRadius:20,border:`1px solid ${G.g3}33`}}>{payment.receipt_number}</span>
        </div>
        <div style={{borderTop:`1px solid ${G.border}`,paddingTop:12}}>
          {rows.map(([l,v])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${G.border}`,fontSize:13}}>
              <span style={{color:G.muted}}>{l}</span><span style={{fontWeight:500,textAlign:"right",maxWidth:"60%"}}>{v}</span>
            </div>
          ))}
          <div style={{display:"flex",justifyContent:"space-between",fontSize:16,fontWeight:700,padding:"12px 0 4px",borderTop:`2px solid ${G.g2}`,marginTop:8,color:G.g1}}>
            <span>Amount paid</span><span>{fmt(payment.amount_paid)}</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:13,color:balance<=0?G.g2:G.red,paddingTop:4,fontWeight:600}}>
            <span>Remaining balance</span><span>{fmt(balance)}</span>
          </div>
        </div>
        <div style={{textAlign:"center",marginTop:16,fontSize:11,color:G.muted,borderTop:`1px dashed ${G.border}`,paddingTop:12}}>
          This is an official receipt from Gratitude Bilingual Nursery & Primary School
        </div>
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"center",marginTop:14}}>
        <Btn variant="primary" onClick={()=>window.open("https://wa.me/?text="+encodeURIComponent(whatsappText),"_blank")}>Share via WhatsApp</Btn>
        <Btn onClick={()=>window.print()}>Print</Btn>
      </div>
    </div>
  );
}

// ─── AI Photo Upload ──────────────────────────────────────────────────────────
function PhotoUpload({ type, onExtracted, onClose }) {
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [preview, setPreview] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setStatus("loading");
    setErrorMsg("");
    try {
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(",")[1]);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const response = await fetch("/api/analyze-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: { data: base64, mediaType: file.type }, type })
      });
      const result = await response.json();
      if (result.success && result.data) {
        setStatus("done");
        onExtracted(result.data);
      } else {
        setStatus("error");
        setErrorMsg(result.error || "Could not read the image. Please try again or enter manually.");
      }
    } catch (err) {
      setStatus("error");
      setErrorMsg("Upload failed. Check your connection and try again.");
    }
  }

  return (
    <div style={{marginBottom:16,padding:14,background:G.g5,borderRadius:8,border:`1px solid ${G.g3}33`}}>
      <div style={{fontSize:12,fontWeight:600,color:G.g2,marginBottom:8}}>AI Photo Scan</div>
      <div style={{fontSize:12,color:G.muted,marginBottom:10}}>{type==="student" ? "Take or upload a photo of the student's registration form or handwritten record." : "Take or upload a photo of a payment receipt."} Claude will extract the details automatically.</div>
      {preview && <img src={preview} alt="preview" style={{width:"100%",maxHeight:140,objectFit:"cover",borderRadius:6,marginBottom:10,border:`1px solid ${G.border}`}} />}
      {status==="loading" && <div style={{fontSize:12,color:G.g2,marginBottom:8,fontWeight:500}}>Reading image...</div>}
      {status==="done"   && <div style={{fontSize:12,color:G.g2,marginBottom:8,fontWeight:500}}>Fields filled in below — review and save.</div>}
      {status==="error"  && <div style={{fontSize:12,color:G.red,marginBottom:8}}>{errorMsg}</div>}
      <label style={{display:"inline-block",padding:"7px 14px",background:status==="loading"?G.muted:G.g2,color:"#fff",borderRadius:7,fontSize:13,fontWeight:500,cursor:status==="loading"?"not-allowed":"pointer"}}>
        {status==="loading" ? "Scanning..." : status==="done" ? "Scan another photo" : "Take / upload photo"}
        <input type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={handleFile} disabled={status==="loading"} />
      </label>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage]       = useState("dashboard");
  const [students, setStudents] = useState([]);
  const [fees, setFees]         = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(null);
  const [form, setForm]         = useState({});
  const [search, setSearch]     = useState("");
  const [gFilter, setGFilter]   = useState("");
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState(null);
  const [err, setErr]           = useState(null);

  // ── Data fetch ──────────────────────────────────────────────────────────────
  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const [s, f, p] = await Promise.all([
      supabase.from("students").select("*").order("first_name"),
      supabase.from("fees").select("*").order("name"),
      supabase.from("payments").select("*").order("created_at", { ascending: false }),
    ]);
    if (s.error) { setErr(s.error.message); setLoading(false); return; }
    setStudents(s.data||[]);
    setFees(f.data||[]);
    setPayments(p.data||[]);
    setLoading(false);
  }

  // ── Finance helpers ─────────────────────────────────────────────────────────
  const totalDue  = useCallback(id => {
    const st = students.find(x => x.id===id);
    if (!st) return 0;
    return fees.filter(f => f.grades==="all" || f.grades===st.grade).reduce((s,f)=>s+parseFloat(f.amount||0),0);
  }, [students, fees]);
  const totalPaid = useCallback(id => payments.filter(p=>p.student_id===id).reduce((s,p)=>s+parseFloat(p.amount_paid||0),0), [payments]);
  const balance   = useCallback(id => totalDue(id)-totalPaid(id), [totalDue, totalPaid]);

  const activeStudents = students.filter(s=>s.status==="active");
  const totalExpected  = activeStudents.reduce((s,st)=>s+totalDue(st.id),0);
  const totalCollected = activeStudents.reduce((s,st)=>s+totalPaid(st.id),0);
  const collRate       = totalExpected>0 ? Math.round(totalCollected/totalExpected*100) : 0;

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const showToast = msg => { setToast(msg); setTimeout(()=>setToast(null),3000); };
  const openModal = (type, data={}) => { setForm({ payment_date:today(), received_by:"Admin", method:"cash", status:"active", enrolled_at:today(), ...data }); setModal(type); };
  const closeModal = () => { setModal(null); setForm({}); };
  const ff = k => e => setForm(f=>({...f, [k]: e.target.value}));

  // ── Save Student ────────────────────────────────────────────────────────────
  async function saveStudent() {
    if (!form.first_name?.trim()||!form.last_name?.trim()||!form.grade) { showToast("First name, last name and class are required."); return; }
    setSaving(true);
    const payload = { first_name:form.first_name.trim(), last_name:form.last_name.trim(), date_of_birth:form.date_of_birth||null, gender:form.gender||null, grade:form.grade, parent_name:form.parent_name||null, phone:form.phone||null, enrolled_at:form.enrolled_at||today(), status:form.status||"active", notes:form.notes||null };
    const { error } = form.id
      ? await supabase.from("students").update(payload).eq("id", form.id)
      : await supabase.from("students").insert([payload]);
    setSaving(false);
    if (error) { showToast("Error: "+error.message); return; }
    closeModal(); fetchAll(); showToast(form.id ? "Student updated!" : "Student added!");
  }

  // ── Save Fee ────────────────────────────────────────────────────────────────
  async function saveFee() {
    if (!form.name?.trim() || !parseFloat(form.amount)) { showToast("Name and amount are required."); return; }
    setSaving(true);
    const payload = { name:form.name.trim(), category:form.category||"tuition", term:form.term||"Term 1", grades:form.grades||"all", amount:parseFloat(form.amount), academic_year:"2025-2026" };
    const { error } = form.id
      ? await supabase.from("fees").update(payload).eq("id", form.id)
      : await supabase.from("fees").insert([payload]);
    setSaving(false);
    if (error) { showToast("Error: "+error.message); return; }
    closeModal(); fetchAll(); showToast("Fee saved!");
  }

  // ── Save Payment ────────────────────────────────────────────────────────────
  async function savePayment() {
    if (!form.student_id || !parseFloat(form.amount_paid) || !form.payment_date) { showToast("Student, amount and date are required."); return; }
    setSaving(true);
    const feeObj = fees.find(f=>f.id===form.fee_id);
    const payload = { student_id:form.student_id, fee_id:form.fee_id||null, fee_name:feeObj?`${feeObj.name} – ${feeObj.term}`:"General payment", amount_paid:parseFloat(form.amount_paid), payment_date:form.payment_date, method:form.method||"cash", received_by:form.received_by||"Admin", notes:form.notes||null };
    const { data, error } = await supabase.from("payments").insert([payload]).select().single();
    setSaving(false);
    if (error) { showToast("Error: "+error.message); return; }
    await fetchAll();
    closeModal();
    openModal("receipt", { payment: data });
    showToast("Payment recorded!");
  }

  // ── Delete ──────────────────────────────────────────────────────────────────
  async function deleteStudent(id) {
    const hasPayments = payments.some(p=>p.student_id===id);
    if (hasPayments) { showToast("Cannot delete a student with payment records."); return; }
    await supabase.from("students").delete().eq("id", id);
    closeModal(); fetchAll(); showToast("Student removed.");
  }
  async function deleteFee(id) {
    await supabase.from("fees").delete().eq("id", id);
    fetchAll(); showToast("Fee removed.");
  }

  // ── AI photo → form fill ────────────────────────────────────────────────────
  function onStudentExtracted(data) {
    setForm(f=>({
      ...f,
      first_name:   data.firstName   || f.first_name,
      last_name:    data.lastName    || f.last_name,
      date_of_birth:data.dateOfBirth || f.date_of_birth,
      gender:       data.gender      || f.gender,
      grade:        GRADES.find(g=>g.toLowerCase()===data.grade?.toLowerCase()) || f.grade,
      parent_name:  data.parentName  || f.parent_name,
      phone:        data.phone       || f.phone,
      notes:        data.notes       || f.notes,
    }));
  }

  // ── Loading / error states ──────────────────────────────────────────────────
  if (loading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",fontFamily:"Georgia,serif",color:G.g2,fontSize:18,gap:12}}>Loading...</div>;
  if (err)     return <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh",gap:12,padding:20}}><div style={{fontSize:16,color:G.red,fontWeight:600}}>Connection error</div><div style={{fontSize:13,color:G.muted,maxWidth:400,textAlign:"center"}}>{err}</div><div style={{fontSize:12,color:G.muted,maxWidth:400,textAlign:"center"}}>Check your .env file has the correct VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY values.</div><Btn onClick={fetchAll}>Retry</Btn></div>;

  // ── Nav ─────────────────────────────────────────────────────────────────────
  const navItems = [{id:"dashboard",label:"Dashboard"},{id:"students",label:"Students"},{id:"fees",label:"Fee Structure"},{id:"payments",label:"Payments"},{id:"reports",label:"Reports"}];

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{display:"flex",minHeight:"100vh",background:G.bg,fontFamily:"system-ui,-apple-system,sans-serif"}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Sidebar */}
      <div style={{width:200,background:G.g1,display:"flex",flexDirection:"column",flexShrink:0,position:"sticky",top:0,height:"100vh",overflowY:"auto"}}>
        <div style={{padding:"10px 12px 10px",borderBottom:"1px solid rgba(255,255,255,.12)",textAlign:"center"}}>
          <img src="/logo.png" alt="Gratitude Bilingual Nursery" style={{width:"100%",maxWidth:160,borderRadius:6,background:"#fff",padding:"5px"}}/>
          <div style={{fontSize:11,color:"rgba(255,255,255,.45)",marginTop:6}}>Admin System</div>
        </div>
        <nav style={{padding:"10px 0",flex:1}}>
          {navItems.map(n=>(
            <div key={n.id} onClick={()=>{setPage(n.id);setSearch("");}} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 16px",fontSize:13,color:page===n.id?"#fff":"rgba(255,255,255,.65)",cursor:"pointer",borderLeft:`3px solid ${page===n.id?"#7DBE4A":"transparent"}`,background:page===n.id?"rgba(255,255,255,.13)":"transparent",transition:"all .15s"}}>
              <div style={{width:7,height:7,borderRadius:"50%",background:page===n.id?"#7DBE4A":"rgba(255,255,255,.3)",flexShrink:0}}/>
              {n.label}
            </div>
          ))}
        </nav>
        <div style={{padding:"12px 16px",borderTop:"1px solid rgba(255,255,255,.1)",fontSize:11,color:"rgba(255,255,255,.35)"}}>© 2026 Gratitude Bilingual Nursery</div>
      </div>

      {/* Main */}
      <div style={{flex:1,overflowY:"auto",padding:24,maxWidth:"calc(100vw - 200px)"}}>

        {/* ── DASHBOARD ── */}
        {page==="dashboard" && (
          <div>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:20}}>
              <div><div style={{fontFamily:"Georgia,serif",fontSize:21,fontWeight:"bold",color:G.g1}}>Dashboard</div><div style={{fontSize:12,color:G.muted,marginTop:3}}>{new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div></div>
              <Btn variant="primary" onClick={()=>openModal("payment",{student_id:activeStudents[0]?.id||""})}>+ Record Payment</Btn>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:18}}>
              <StatCard label="Total students" value={activeStudents.length} color={G.blue}/>
              <StatCard label="Total expected" value={fmt(totalExpected)}/>
              <StatCard label="Collected" value={fmt(totalCollected)} color={G.g2}/>
              <StatCard label="Outstanding" value={fmt(totalExpected-totalCollected)} color={totalExpected-totalCollected>0?G.red:G.g2} progress={collRate}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <Card>
                <CardHeader>Collection by class</CardHeader>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead><tr><th style={th}>Class</th><th style={th}>Students</th><th style={th}>Paid</th><th style={th}>Balance</th><th style={th}>Rate</th></tr></thead>
                  <tbody>
                    {GRADES.map(g=>{
                      const sts=activeStudents.filter(x=>x.grade===g); if(!sts.length)return null;
                      const due=sts.reduce((s,st)=>s+totalDue(st.id),0), paid=sts.reduce((s,st)=>s+totalPaid(st.id),0), r=due>0?Math.round(paid/due*100):0;
                      return <tr key={g}><td style={td}>{g}</td><td style={td}>{sts.length}</td><td style={td}>{fmt(paid)}</td><td style={td}>{fmt(due-paid)}</td><td style={td}><Badge color={r>=80?"green":r>=50?"amber":"red"}>{r}%</Badge></td></tr>;
                    })}
                    {!GRADES.some(g=>activeStudents.some(x=>x.grade===g))&&<tr><td colSpan={5} style={{...td,textAlign:"center",color:G.muted}}>No students yet</td></tr>}
                  </tbody>
                </table>
              </Card>
              <Card>
                <CardHeader>Recent payments</CardHeader>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead><tr><th style={th}>Student</th><th style={th}>Amount</th><th style={th}>Date</th><th style={th}>Method</th></tr></thead>
                  <tbody>
                    {payments.slice(0,7).map(p=>{const st=students.find(x=>x.id===p.student_id);return <tr key={p.id}><td style={td}>{st?`${st.first_name} ${st.last_name}`:"—"}</td><td style={{...td,color:G.g2,fontWeight:600}}>{fmt(p.amount_paid)}</td><td style={td}>{p.payment_date}</td><td style={td}><Badge color="gray">{METHODS[p.method]||p.method}</Badge></td></tr>;}) }
                    {!payments.length&&<tr><td colSpan={4} style={{...td,textAlign:"center",color:G.muted}}>No payments yet</td></tr>}
                  </tbody>
                </table>
              </Card>
            </div>
            <Card>
              <CardHeader action={<span style={{fontSize:12,fontWeight:400,color:G.muted}}>{activeStudents.filter(s=>balance(s.id)>0).length} students</span>}>Outstanding balances</CardHeader>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr><th style={th}>Student</th><th style={th}>Class</th><th style={th}>Total due</th><th style={th}>Paid</th><th style={th}>Balance</th><th style={th}></th></tr></thead>
                <tbody>
                  {activeStudents.filter(s=>balance(s.id)>0).sort((a,b)=>balance(b.id)-balance(a.id)).map(s=>(
                    <tr key={s.id} style={{cursor:"pointer"}} onClick={()=>openModal("profile",{student:s})}>
                      <td style={td}><strong>{s.first_name} {s.last_name}</strong></td><td style={td}>{s.grade}</td>
                      <td style={td}>{fmt(totalDue(s.id))}</td><td style={{...td,color:G.g2}}>{fmt(totalPaid(s.id))}</td>
                      <td style={{...td,color:G.red,fontWeight:700}}>{fmt(balance(s.id))}</td>
                      <td style={td}><Btn size="sm" variant="amber" onClick={e=>{e.stopPropagation();openModal("payment",{student_id:s.id});}}>Pay</Btn></td>
                    </tr>
                  ))}
                  {!activeStudents.some(s=>balance(s.id)>0)&&<tr><td colSpan={6} style={{...td,textAlign:"center",color:G.muted,padding:20}}>No outstanding balances!</td></tr>}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        {/* ── STUDENTS ── */}
        {page==="students" && (
          <div>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:20}}>
              <div><div style={{fontFamily:"Georgia,serif",fontSize:21,fontWeight:"bold",color:G.g1}}>Student Register</div><div style={{fontSize:12,color:G.muted,marginTop:3}}>{activeStudents.length} active students</div></div>
              <Btn variant="primary" onClick={()=>openModal("student")}>+ Add Student</Btn>
            </div>
            <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
              <input style={{...inp,flex:1,minWidth:180}} placeholder="Search by name or ID..." value={search} onChange={e=>setSearch(e.target.value)}/>
              <Sel value={gFilter} onChange={e=>setGFilter(e.target.value)} style={{...inp,width:"auto"}}><option value="">All classes</option>{GRADES.map(g=><option key={g}>{g}</option>)}</Sel>
            </div>
            <Card>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr><th style={th}>ID</th><th style={th}>Name</th><th style={th}>Class</th><th style={th}>Parent</th><th style={th}>Contact</th><th style={th}>Balance</th><th style={th}>Status</th><th style={th}></th></tr></thead>
                <tbody>
                  {students.filter(st=>{
                    const q=search.toLowerCase();
                    return(!q||(st.first_name+" "+st.last_name+" "+(st.student_code||"")).toLowerCase().includes(q))&&(!gFilter||st.grade===gFilter);
                  }).map(st=>{
                    const bal=balance(st.id);
                    return <tr key={st.id} style={{cursor:"pointer"}} onClick={()=>openModal("profile",{student:st})}>
                      <td style={{...td,fontFamily:"monospace",fontSize:12,color:G.muted}}>{st.student_code}</td>
                      <td style={td}><strong>{st.first_name} {st.last_name}</strong></td>
                      <td style={td}>{st.grade}</td>
                      <td style={td}>{st.parent_name||"—"}</td>
                      <td style={{...td,fontSize:12}}>{st.phone||"—"}</td>
                      <td style={td}><Badge color={bal<=0?"green":bal<50?"amber":"red"}>{fmt(bal)}</Badge></td>
                      <td style={td}><Badge color={st.status==="active"?"blue":"gray"}>{st.status}</Badge></td>
                      <td style={td}><Btn size="sm" onClick={e=>{e.stopPropagation();openModal("student",{...st});}}>Edit</Btn></td>
                    </tr>;
                  })}
                  {!students.length&&<tr><td colSpan={8} style={{...td,textAlign:"center",color:G.muted,padding:30}}>No students yet. Click "+ Add Student" to begin.</td></tr>}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        {/* ── FEES ── */}
        {page==="fees" && (
          <div>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:20}}>
              <div><div style={{fontFamily:"Georgia,serif",fontSize:21,fontWeight:"bold",color:G.g1}}>Fee Structure</div><div style={{fontSize:12,color:G.muted,marginTop:3}}>Academic year 2025–2026</div></div>
              <Btn variant="primary" onClick={()=>openModal("fee",{category:"tuition",term:"Term 1",grades:"all"})}>+ Add Fee</Btn>
            </div>
            <Card>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr><th style={th}>Fee name</th><th style={th}>Category</th><th style={th}>Term</th><th style={th}>Applies to</th><th style={th}>Amount (BHD)</th><th style={th}></th></tr></thead>
                <tbody>
                  {fees.map(f=>(
                    <tr key={f.id}>
                      <td style={td}><strong>{f.name}</strong></td>
                      <td style={td}><Badge color="gray">{CATS[f.category]||f.category}</Badge></td>
                      <td style={td}>{f.term}</td>
                      <td style={td}>{f.grades==="all"?"All classes":f.grades}</td>
                      <td style={{...td,fontWeight:600}}>{fmt(f.amount)}</td>
                      <td style={td}><div style={{display:"flex",gap:6}}><Btn size="sm" onClick={()=>openModal("fee",{...f})}>Edit</Btn><Btn size="sm" variant="danger" onClick={()=>deleteFee(f.id)}>Delete</Btn></div></td>
                    </tr>
                  ))}
                  {!fees.length&&<tr><td colSpan={6} style={{...td,textAlign:"center",color:G.muted,padding:30}}>No fees defined yet.</td></tr>}
                </tbody>
              </table>
            </Card>
            <Card>
              <CardHeader>Annual fee summary by class</CardHeader>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr><th style={th}>Class</th><th style={th}>Per student</th><th style={th}>Students</th><th style={th}>Total expected</th></tr></thead>
                <tbody>
                  {GRADES.map(g=>{
                    const sts=activeStudents.filter(x=>x.grade===g); if(!sts.length)return null;
                    const per=fees.filter(f=>f.grades==="all"||f.grades===g).reduce((s,f)=>s+parseFloat(f.amount||0),0);
                    return <tr key={g}><td style={td}>{g}</td><td style={{...td,fontWeight:600}}>{fmt(per)}</td><td style={td}>{sts.length}</td><td style={{...td,fontWeight:600,color:G.g2}}>{fmt(per*sts.length)}</td></tr>;
                  })}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        {/* ── PAYMENTS ── */}
        {page==="payments" && (
          <div>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:20}}>
              <div><div style={{fontFamily:"Georgia,serif",fontSize:21,fontWeight:"bold",color:G.g1}}>Payments</div><div style={{fontSize:12,color:G.muted,marginTop:3}}>{payments.length} payment{payments.length!==1?"s":""} recorded</div></div>
              <Btn variant="primary" onClick={()=>openModal("payment",{student_id:activeStudents[0]?.id||""})}>+ Record Payment</Btn>
            </div>
            <div style={{display:"flex",gap:8,marginBottom:12}}><input style={{...inp,flex:1}} placeholder="Search by student name or receipt number..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
            <Card>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr><th style={th}>Receipt #</th><th style={th}>Student</th><th style={th}>Class</th><th style={th}>Fee</th><th style={th}>Amount</th><th style={th}>Date</th><th style={th}>Method</th><th style={th}></th></tr></thead>
                <tbody>
                  {payments.filter(p=>{const st=students.find(x=>x.id===p.student_id);const q=search.toLowerCase();return!q||((st?`${st.first_name} ${st.last_name}`:"")+(p.receipt_number||"")).toLowerCase().includes(q);}).map(p=>{
                    const st=students.find(x=>x.id===p.student_id);
                    return <tr key={p.id}>
                      <td style={{...td,fontFamily:"monospace",fontSize:12,color:G.muted}}>{p.receipt_number}</td>
                      <td style={{...td,color:G.g2,fontWeight:500,cursor:"pointer"}} onClick={()=>openModal("profile",{student:st})}>{st?`${st.first_name} ${st.last_name}`:"—"}</td>
                      <td style={td}>{st?st.grade:"—"}</td>
                      <td style={{...td,fontSize:12}}>{p.fee_name||"—"}</td>
                      <td style={{...td,fontWeight:600}}>{fmt(p.amount_paid)}</td>
                      <td style={td}>{p.payment_date}</td>
                      <td style={td}><Badge color="gray">{METHODS[p.method]||p.method}</Badge></td>
                      <td style={td}><Btn size="sm" onClick={()=>openModal("receipt",{payment:p})}>Receipt</Btn></td>
                    </tr>;
                  })}
                  {!payments.length&&<tr><td colSpan={8} style={{...td,textAlign:"center",color:G.muted,padding:30}}>No payments recorded yet.</td></tr>}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        {/* ── REPORTS ── */}
        {page==="reports" && (
          <div>
            <div style={{fontFamily:"Georgia,serif",fontSize:21,fontWeight:"bold",color:G.g1,marginBottom:20}}>Reports</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
              <Card>
                <CardHeader>Payment method breakdown</CardHeader>
                <div style={{padding:14}}>
                  {Object.entries(METHODS).map(([m,label])=>{
                    const v=payments.filter(p=>p.method===m).reduce((s,p)=>s+parseFloat(p.amount_paid||0),0);
                    const total=payments.reduce((s,p)=>s+parseFloat(p.amount_paid||0),0);
                    const pct=total>0?Math.round(v/total*100):0;
                    return <div key={m} style={{marginBottom:14}}><div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:4}}><span>{label}</span><span style={{fontWeight:600}}>{fmt(v)}</span></div><Progress value={pct}/><div style={{fontSize:11,color:G.muted,marginTop:2}}>{pct}% of collections</div></div>;
                  })}
                  {!payments.length&&<div style={{textAlign:"center",color:G.muted,fontSize:13}}>No payments yet</div>}
                </div>
              </Card>
              <Card>
                <CardHeader>Class collection rates</CardHeader>
                <div style={{padding:14}}>
                  {GRADES.map(g=>{
                    const sts=activeStudents.filter(x=>x.grade===g); if(!sts.length)return null;
                    const due=sts.reduce((s,st)=>s+totalDue(st.id),0), paid=sts.reduce((s,st)=>s+totalPaid(st.id),0), r=due>0?Math.round(paid/due*100):0;
                    return <div key={g} style={{marginBottom:14}}><div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:4}}><span>{g} <span style={{fontSize:11,color:G.muted}}>({sts.length})</span></span><span style={{fontWeight:600}}>{r}%</span></div><Progress value={r} color={r>=80?G.g3:r>=50?G.amber:G.red}/></div>;
                  })}
                  {!GRADES.some(g=>activeStudents.some(x=>x.grade===g))&&<div style={{textAlign:"center",color:G.muted,fontSize:13}}>No data yet</div>}
                </div>
              </Card>
            </div>
            <Card>
              <CardHeader action={<span style={{fontSize:12,fontWeight:400,color:G.muted}}>{activeStudents.filter(x=>balance(x.id)>0).length} students · {fmt(activeStudents.filter(x=>balance(x.id)>0).reduce((s,x)=>s+balance(x.id),0))} total</span>}>Fee defaulters</CardHeader>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr><th style={th}>Student</th><th style={th}>Class</th><th style={th}>Parent contact</th><th style={th}>Balance due</th><th style={th}></th></tr></thead>
                <tbody>
                  {activeStudents.filter(x=>balance(x.id)>0).sort((a,b)=>balance(b.id)-balance(a.id)).map(st=>(
                    <tr key={st.id}><td style={td}><strong>{st.first_name} {st.last_name}</strong></td><td style={td}>{st.grade}</td><td style={{...td,fontSize:12}}>{st.phone||"—"}</td><td style={{...td,color:G.red,fontWeight:700}}>{fmt(balance(st.id))}</td><td style={td}><Btn size="sm" variant="amber" onClick={()=>openModal("payment",{student_id:st.id})}>Record payment</Btn></td></tr>
                  ))}
                  {!activeStudents.some(x=>balance(x.id)>0)&&<tr><td colSpan={5} style={{...td,textAlign:"center",color:G.muted,padding:20}}>No defaulters — excellent!</td></tr>}
                </tbody>
              </table>
            </Card>
          </div>
        )}
      </div>

      {/* ── MODAL: Add / Edit Student ── */}
      <Modal open={modal==="student"} onClose={closeModal} title={form.id?"Edit Student":"Add Student"}
        footer={<><Btn onClick={closeModal}>Cancel</Btn><Btn variant="primary" onClick={saveStudent} disabled={saving}>{saving?<Spinner/>:form.id?"Save changes":"Add student"}</Btn></>}>
        <PhotoUpload type="student" onExtracted={onStudentExtracted} onClose={closeModal}/>
        <FormGrid>
          <FG label="First name *"><Input value={form.first_name||""} onChange={ff("first_name")} placeholder="e.g. Aisha"/></FG>
          <FG label="Last name *"><Input value={form.last_name||""} onChange={ff("last_name")} placeholder="e.g. Mohammed"/></FG>
          <FG label="Date of birth"><Input type="date" value={form.date_of_birth||""} onChange={ff("date_of_birth")}/></FG>
          <FG label="Gender"><Sel value={form.gender||""} onChange={ff("gender")}><option value="">Select...</option><option>Male</option><option>Female</option></Sel></FG>
          <FG label="Class / Grade *"><Sel value={form.grade||""} onChange={ff("grade")}><option value="">Select...</option>{GRADES.map(g=><option key={g}>{g}</option>)}</Sel></FG>
          <FG label="Enrollment date"><Input type="date" value={form.enrolled_at||""} onChange={ff("enrolled_at")}/></FG>
          <FG label="Parent / Guardian"><Input value={form.parent_name||""} onChange={ff("parent_name")} placeholder="e.g. Fatima Mohammed"/></FG>
          <FG label="Contact number"><Input value={form.phone||""} onChange={ff("phone")} placeholder="+973 3300 0000"/></FG>
          <FG label="Status" full><Sel value={form.status||"active"} onChange={ff("status")}><option value="active">Active</option><option value="inactive">Inactive</option></Sel></FG>
          <FG label="Notes" full><Input value={form.notes||""} onChange={ff("notes")} placeholder="Optional..."/></FG>
        </FormGrid>
      </Modal>

      {/* ── MODAL: Student Profile ── */}
      {modal==="profile" && form.student && (() => {
        const st = students.find(x=>x.id===form.student.id)||form.student;
        const due=totalDue(st.id), paid=totalPaid(st.id), bal=balance(st.id);
        const stuPayments=payments.filter(p=>p.student_id===st.id);
        const stuFees=fees.filter(f=>f.grades==="all"||f.grades===st.grade);
        return (
          <Modal open size="lg" onClose={closeModal} title="Student Profile"
            footer={<><Btn onClick={closeModal}>Close</Btn><Btn variant="amber" onClick={()=>{closeModal();setTimeout(()=>openModal("payment",{student_id:st.id}),100);}}>Record Payment</Btn><Btn variant="primary" onClick={()=>{closeModal();setTimeout(()=>openModal("student",{...st}),100);}}>Edit</Btn></>}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16,padding:14,background:G.g5,borderRadius:8}}>
              <div style={{width:48,height:48,borderRadius:"50%",background:"#D4EDBA",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700,color:G.g2,flexShrink:0}}>{inits(st)}</div>
              <div style={{flex:1}}>
                <div style={{fontFamily:"Georgia,serif",fontSize:16,fontWeight:"bold"}}>{st.first_name} {st.last_name}</div>
                <div style={{fontSize:12,color:G.muted,marginTop:2}}>{st.student_code} · {st.grade} · <Badge color={st.status==="active"?"blue":"gray"}>{st.status}</Badge></div>
                {st.parent_name&&<div style={{fontSize:12,color:G.muted,marginTop:2}}>Parent: {st.parent_name}{st.phone?" · "+st.phone:""}</div>}
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:11,color:G.muted}}>Balance due</div>
                <div style={{fontSize:20,fontWeight:700,color:bal<=0?G.g2:G.red}}>{fmt(bal)}</div>
                <div style={{fontSize:11,color:G.muted}}>{fmt(paid)} paid of {fmt(due)}</div>
              </div>
            </div>
            <div style={{fontWeight:600,fontSize:13,marginBottom:8,color:G.g1}}>Fee ledger</div>
            <Card style={{marginBottom:14}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr><th style={th}>Fee</th><th style={th}>Term</th><th style={th}>Amount</th></tr></thead>
                <tbody>
                  {stuFees.map(f=><tr key={f.id}><td style={td}>{f.name}</td><td style={td}>{f.term}</td><td style={td}>{fmt(f.amount)}</td></tr>)}
                  {!stuFees.length&&<tr><td colSpan={3} style={{...td,textAlign:"center",color:G.muted}}>No fees assigned</td></tr>}
                  {stuFees.length>0&&<tr style={{background:G.g5}}><td style={{...td,fontWeight:600}} colSpan={2}>Total due</td><td style={{...td,fontWeight:700}}>{fmt(due)}</td></tr>}
                </tbody>
              </table>
            </Card>
            <div style={{fontWeight:600,fontSize:13,marginBottom:8,color:G.g1}}>Payment history</div>
            <Card>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr><th style={th}>Receipt</th><th style={th}>Fee</th><th style={th}>Amount</th><th style={th}>Date</th><th style={th}>Method</th><th style={th}></th></tr></thead>
                <tbody>
                  {stuPayments.map(p=><tr key={p.id}><td style={{...td,fontFamily:"monospace",fontSize:11,color:G.muted}}>{p.receipt_number}</td><td style={td}>{p.fee_name||"—"}</td><td style={{...td,color:G.g2,fontWeight:600}}>{fmt(p.amount_paid)}</td><td style={td}>{p.payment_date}</td><td style={td}>{METHODS[p.method]||p.method}</td><td style={td}><Btn size="sm" onClick={()=>openModal("receipt",{payment:p})}>View</Btn></td></tr>)}
                  {!stuPayments.length&&<tr><td colSpan={6} style={{...td,textAlign:"center",color:G.muted}}>No payments yet</td></tr>}
                  {stuPayments.length>0&&<tr style={{background:G.g5}}><td colSpan={2} style={{...td,fontWeight:600}}>Total paid</td><td style={{...td,fontWeight:700,color:G.g2}}>{fmt(paid)}</td><td colSpan={3}></td></tr>}
                </tbody>
              </table>
            </Card>
            <div style={{display:"flex",gap:8,marginTop:8}}>
              <Btn variant="danger" onClick={()=>deleteStudent(st.id)}>Remove student</Btn>
            </div>
          </Modal>
        );
      })()}

      {/* ── MODAL: Add / Edit Fee ── */}
      <Modal open={modal==="fee"} onClose={closeModal} title={form.id?"Edit Fee":"Add Fee"} size="sm"
        footer={<><Btn onClick={closeModal}>Cancel</Btn><Btn variant="primary" onClick={saveFee} disabled={saving}>{saving?<Spinner/>:"Save fee"}</Btn></>}>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <FG label="Fee name *"><Input value={form.name||""} onChange={ff("name")} placeholder="e.g. Tuition Fee"/></FG>
          <FormGrid>
            <FG label="Category"><Sel value={form.category||"tuition"} onChange={ff("category")}>{Object.entries(CATS).map(([v,l])=><option key={v} value={v}>{l}</option>)}</Sel></FG>
            <FG label="Term"><Sel value={form.term||"Term 1"} onChange={ff("term")}>{TERMS.map(t=><option key={t}>{t}</option>)}</Sel></FG>
            <FG label="Amount (BHD) *"><Input type="number" step="1" value={form.amount||""} onChange={ff("amount")} placeholder="e.g. 50000"/></FG>
            <FG label="Applies to"><Sel value={form.grades||"all"} onChange={ff("grades")}><option value="all">All classes</option>{GRADES.map(g=><option key={g} value={g}>{g}</option>)}</Sel></FG>
          </FormGrid>
        </div>
      </Modal>

      {/* ── MODAL: Record Payment ── */}
      {modal==="payment" && (()=>{
        const selSt = students.find(x=>x.id===form.student_id);
        const appFees = fees.filter(f=>!selSt||f.grades==="all"||f.grades===selSt.grade);
        const bal = selSt ? balance(selSt.id) : null;
        return (
          <Modal open onClose={closeModal} title="Record Payment"
            footer={<><Btn onClick={closeModal}>Cancel</Btn><Btn variant="primary" onClick={savePayment} disabled={saving}>{saving?<Spinner/>:"Save & generate receipt"}</Btn></>}>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <FG label="Student *">
                <Sel value={form.student_id||""} onChange={e=>setForm(f=>({...f,student_id:e.target.value,fee_id:""}))}>
                  <option value="">Select student...</option>
                  {activeStudents.sort((a,b)=>(a.first_name+a.last_name).localeCompare(b.first_name+b.last_name)).map(st=><option key={st.id} value={st.id}>{st.first_name} {st.last_name} ({st.grade})</option>)}
                </Sel>
              </FG>
              {selSt && bal!==null && <div style={{padding:"9px 12px",background:G.g5,borderRadius:7,fontSize:13}}>Balance due: <strong style={{color:bal>0?G.red:G.g2}}>{fmt(bal)}</strong> · Paid so far: {fmt(totalPaid(selSt.id))}</div>}
              <FG label="Fee item">
                <Sel value={form.fee_id||""} onChange={ff("fee_id")}>
                  <option value="">— General / unspecified —</option>
                  {appFees.map(f=><option key={f.id} value={f.id}>{f.name} – {f.term} ({fmt(f.amount)})</option>)}
                </Sel>
              </FG>
              <FormGrid>
                <FG label="Amount paid (BHD) *"><Input type="number" step="1" value={form.amount_paid||""} onChange={ff("amount_paid")} placeholder="e.g. 50000"/></FG>
                <FG label="Date *"><Input type="date" value={form.payment_date||today()} onChange={ff("payment_date")}/></FG>
                <FG label="Payment method"><Sel value={form.method||"cash"} onChange={ff("method")}>{Object.entries(METHODS).map(([v,l])=><option key={v} value={v}>{l}</option>)}</Sel></FG>
                <FG label="Received by"><Input value={form.received_by||"Admin"} onChange={ff("received_by")}/></FG>
                <FG label="Notes" full><Input value={form.notes||""} onChange={ff("notes")} placeholder="Optional..."/></FG>
              </FormGrid>
            </div>
          </Modal>
        );
      })()}

      {/* ── MODAL: Receipt ── */}
      {modal==="receipt" && form.payment && (()=>{
        const p = form.payment;
        const st = students.find(x=>x.id===p.student_id);
        const bal = st ? balance(st.id) : 0;
        return <Modal open size="sm" onClose={closeModal} title="Payment Receipt"><Receipt payment={p} student={st} balance={bal}/></Modal>;
      })()}

      {/* Toast */}
      {toast && <div style={{position:"fixed",bottom:24,right:24,background:G.g1,color:"#fff",padding:"10px 18px",borderRadius:8,fontSize:13,fontWeight:500,zIndex:999,boxShadow:"0 4px 20px rgba(0,0,0,.25)"}}>{toast}</div>}
    </div>
  );
}
