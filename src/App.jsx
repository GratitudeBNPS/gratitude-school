import { useState, useEffect, useCallback, useRef } from "react";
import { jsPDF } from "jspdf";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { supabase } from "./lib/supabase";

const GRADES=["KG A","KG B","Grade 1","Grade 2","Grade 3","Grade 4","Grade 5","Grade 6"];
const METHODS={cash:"Cash",bank:"Bank transfer",mobile:"Mobile payment"};
const CATS={tuition:"Tuition",activity:"Activity",transport:"Transport",meals:"Meals",uniform:"Uniform",other:"Other"};
const TERMS=["Term 1","Term 2","Term 3","Annual","Monthly"];
const ROLES={super_admin:"Super Admin",registry_admin:"Registry Admin",fee_admin:"Fee Admin"};
const G={g1:"#1B3A0C",g2:"#2E5818",g3:"#4A7C2F",g5:"#F0F8E8",amber:"#9E6B08",amberBg:"#FEF6E0",red:"#B91C1C",redBg:"#FEF2F2",blue:"#1E40AF",blueBg:"#EFF6FF",bg:"#F5F5F0",surface:"#FFFFFF",border:"#E0E0D4",text:"#18181A",muted:"#6B6B60"};

const fmt=n=>"XAF "+Math.round(parseFloat(n||0)).toLocaleString();
const today=()=>new Date().toISOString().slice(0,10);
const inits=s=>(s.first_name?.[0]||"")+(s.last_name?.[0]||"");
const can=(role,action)=>{const p={super_admin:["students","fees","payments","reports","settings","users","edit_payments","bulk_import"],registry_admin:["students","reports","bulk_import"],fee_admin:["fees","payments","reports","edit_payments"]};return(p[role]||[]).includes(action);};

const inp={width:"100%",padding:"8px 10px",border:`1px solid #E0E0D4`,borderRadius:7,fontSize:13,fontFamily:"inherit",background:"#FFFFFF",color:"#18181A",boxSizing:"border-box"};
const th={textAlign:"left",padding:"8px 12px",fontSize:11,fontWeight:600,color:"#6B6B60",borderBottom:"1px solid #E0E0D4",background:"#F5F5F0",textTransform:"uppercase",letterSpacing:"0.04em"};
const td={padding:"9px 12px",borderBottom:"1px solid #E0E0D4",fontSize:13,color:"#18181A"};

function Badge({color,children}){const m={green:{bg:"#F0F8E8",tc:"#2E5818"},amber:{bg:"#FEF6E0",tc:"#9E6B08"},red:{bg:"#FEF2F2",tc:"#B91C1C"},blue:{bg:"#EFF6FF",tc:"#1E40AF"},gray:{bg:"#F0F0E8",tc:"#6B6B60"}}[color]||{bg:"#F0F0E8",tc:"#6B6B60"};return <span style={{display:"inline-block",padding:"2px 8px",borderRadius:20,fontSize:11,fontWeight:600,background:m.bg,color:m.tc}}>{children}</span>;}
function Btn({onClick,variant="default",size="md",disabled,children,style={}}){const base={padding:size==="sm"?"4px 10px":"7px 14px",fontSize:size==="sm"?12:13,borderRadius:7,border:"1px solid #E0E0D4",cursor:disabled?"not-allowed":"pointer",fontWeight:500,opacity:disabled?0.5:1,...style};const vars={default:{background:"#FFFFFF",color:"#18181A"},primary:{background:"#2E5818",color:"#fff",border:"#2E5818"},amber:{background:"#9E6B08",color:"#fff",border:"#9E6B08"},danger:{background:"#B91C1C",color:"#fff",border:"#B91C1C"},blue:{background:"#1E40AF",color:"#fff",border:"#1E40AF"}};return <button style={{...base,...(vars[variant]||vars.default)}} onClick={disabled?undefined:onClick} disabled={disabled}>{children}</button>;}
function Input(props){return <input style={inp} {...props}/>;}
function Sel({children,...props}){return <select style={inp} {...props}>{children}</select>;}
function FG({label,children,full}){return <div style={full?{gridColumn:"1/-1"}:{}}><label style={{fontSize:11,fontWeight:600,color:"#6B6B60",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:3,display:"block"}}>{label}</label>{children}</div>;}
function FormGrid({children}){return <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>{children}</div>;}
function Card({children,style={}}){return <div style={{background:"#FFFFFF",border:"1px solid #E0E0D4",borderRadius:10,overflow:"hidden",marginBottom:14,...style}}>{children}</div>;}
function CardHeader({children,action}){return <div style={{padding:"11px 14px",borderBottom:"1px solid #E0E0D4",fontWeight:600,fontSize:13,background:"#F5F5F0",display:"flex",alignItems:"center",justifyContent:"space-between"}}><span>{children}</span>{action}</div>;}
function Progress({value,color="#4A7C2F"}){return <div style={{height:4,background:"#E0E0D4",borderRadius:2,overflow:"hidden",marginTop:5}}><div style={{height:"100%",borderRadius:2,background:color,width:`${Math.min(100,Math.max(0,value||0))}%`}}/></div>;}
function Spinner(){return <span style={{display:"inline-block",width:13,height:13,border:"2px solid rgba(255,255,255,.3)",borderTop:"2px solid #fff",borderRadius:"50%",animation:"spin .7s linear infinite",verticalAlign:"middle",marginRight:6}}/>;}

function Modal({open,onClose,title,size="md",footer,children}){
  if(!open)return null;
  const w={sm:400,md:540,lg:700,xl:900}[size];
  return(
    <div onClick={e=>{if(e.target===e.currentTarget)onClose()}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16,overflowY:"auto"}}>
      <div style={{background:"#FFFFFF",borderRadius:12,width:w,maxWidth:"95vw",maxHeight:"92vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,.3)"}}>
        <div style={{padding:"15px 18px 12px",borderBottom:"1px solid #E0E0D4",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,background:"#FFFFFF",zIndex:1}}>
          <div style={{fontFamily:"Georgia,serif",fontSize:16,fontWeight:"bold",color:"#1B3A0C"}}>{title}</div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:"#6B6B60",lineHeight:1}}>×</button>
        </div>
        <div style={{padding:18}}>{children}</div>
        {footer&&<div style={{padding:"12px 18px",borderTop:"1px solid #E0E0D4",background:"#F5F5F0",display:"flex",gap:8,justifyContent:"flex-end"}}>{footer}</div>}
      </div>
    </div>
  );
}

function generateReceiptPDF(payment,student,balance){
  const doc=new jsPDF({unit:"mm",format:"a5"});
  const w=doc.internal.pageSize.getWidth();
  const fmtAmt=n=>"XAF "+Math.round(parseFloat(n||0)).toLocaleString();
  const methods={cash:"Cash",bank:"Bank Transfer",mobile:"Mobile Payment"};

  // ── School header ──
  doc.setFont("helvetica","bold");
  doc.setFontSize(13);
  doc.setTextColor(27,58,12);
  doc.text("GRATITUDE BILINGUAL NURSERY",w/2,18,{align:"center"});
  doc.text("& PRIMARY SCHOOL",w/2,25,{align:"center"});
  doc.setFont("helvetica","normal");
  doc.setFontSize(9);
  doc.setTextColor(107,107,96);
  doc.text("Official Payment Receipt",w/2,31,{align:"center"});

  // ── Receipt number badge ──
  doc.setFillColor(240,248,232);
  doc.roundedRect(w/2-30,34,60,8,2,2,"F");
  doc.setFont("helvetica","bold");
  doc.setFontSize(9);
  doc.setTextColor(46,88,24);
  doc.text(payment.receipt_number||"",w/2,39.5,{align:"center"});

  // ── Divider ──
  doc.setDrawColor(200,210,190);
  doc.setLineWidth(0.4);
  doc.line(10,45,w-10,45);

  // ── Detail rows ──
  const rows=[
    ["Student",student?(student.first_name+" "+student.last_name):"—"],
    ["Student ID",student&&student.student_code?student.student_code:"—"],
    ["Class",student&&student.grade?student.grade:"—"],
    ["Academic Year",payment.academic_year||"—"],
    ["Fee",payment.fee_name||"General payment"],
    ["Method",methods[payment.method]||payment.method||"—"],
    ["Date",payment.payment_date||"—"],
    ["Received by",payment.received_by||"Admin"],
  ];
  if(payment.notes)rows.push(["Notes",payment.notes]);

  let y=53;
  rows.forEach(function(row){
    const label=row[0];const value=row[1];
    doc.setFont("helvetica","normal");
    doc.setFontSize(8.5);
    doc.setTextColor(107,107,96);
    doc.text(label,12,y);
    doc.setFont("helvetica","bold");
    doc.setTextColor(24,24,26);
    const valStr=String(value||"—");
    doc.text(valStr,w-12,y,{align:"right",maxWidth:90});
    doc.setDrawColor(235,235,225);
    doc.setLineWidth(0.2);
    doc.line(12,y+2.5,w-12,y+2.5);
    y+=8;
  });

  // ── Amount paid ──
  y+=3;
  doc.setDrawColor(46,88,24);
  doc.setLineWidth(0.6);
  doc.line(12,y,w-12,y);
  y+=7;
  doc.setFont("helvetica","bold");
  doc.setFontSize(13);
  doc.setTextColor(27,58,12);
  doc.text("Amount Paid",12,y);
  doc.text(fmtAmt(payment.amount_paid),w-12,y,{align:"right"});

  // ── Remaining balance ──
  y+=8;
  doc.setFontSize(10);
  var balNum=parseFloat(balance||0);
  doc.setTextColor(balNum<=0?46:185,balNum<=0?88:28,balNum<=0?24:28);
  doc.text("Remaining Balance",12,y);
  doc.text(fmtAmt(balance),w-12,y,{align:"right"});

  // ── Correction note ──
  if(payment.edited_at){
    y+=8;
    doc.setFont("helvetica","italic");
    doc.setFontSize(8);
    doc.setTextColor(158,107,8);
    doc.text("This receipt was corrected on "+String(payment.edited_at).slice(0,10)+" by "+(payment.edited_by||"Admin"),w/2,y,{align:"center"});
  }

  // ── Footer ──
  y+=10;
  doc.setLineWidth(0.3);
  doc.setDrawColor(224,224,212);
  doc.line(12,y,w-12,y);
  y+=6;
  doc.setFont("helvetica","italic");
  doc.setFontSize(7.5);
  doc.setTextColor(107,107,96);
  doc.text("Official receipt — Gratitude Bilingual Nursery & Primary School",w/2,y,{align:"center"});

  return doc;
}

function Receipt({payment,student,balance}){
  const rows=[["Student",student?`${student.first_name} ${student.last_name}`:"—"],["Student ID",student?.student_code||"—"],["Class",student?.grade||"—"],["Academic Year",payment.academic_year||"—"],["Fee",payment.fee_name||"General payment"],["Payment method",METHODS[payment.method]||payment.method],["Date",payment.payment_date||payment.date],["Received by",payment.received_by||"Admin"],...(payment.notes?[["Notes",payment.notes]]:[])];
  const txt=`*GRATITUDE BILINGUAL NURSERY & PRIMARY SCHOOL*\nPayment Receipt\nReceipt: ${payment.receipt_number}\n\nStudent: ${student?.first_name} ${student?.last_name}\nID: ${student?.student_code}\nClass: ${student?.grade}\nAcademic Year: ${payment.academic_year}\nFee: ${payment.fee_name||"General"}\nDate: ${payment.payment_date}\nMethod: ${METHODS[payment.method]||payment.method}\n\nAmount paid: ${fmt(payment.amount_paid)}\nBalance remaining: ${fmt(balance)}\n\nGratitude Bilingual Nursery & Primary School - Official Receipt`;
  return(
    <div>
      <div style={{border:"2px dashed #E0E0D4",borderRadius:10,padding:20,background:"#FAFAF6"}}>
        <div style={{textAlign:"center",marginBottom:16}}>
          <img src="/logo.png" alt="Gratitude" style={{height:60,marginBottom:8}}/>
          <div style={{fontFamily:"Georgia,serif",fontSize:15,fontWeight:"bold",color:"#1B3A0C"}}>Gratitude Bilingual Nursery & Primary School</div>
          <div style={{fontSize:11,color:"#6B6B60",marginBottom:10}}>Official Payment Receipt</div>
          <span style={{display:"inline-block",background:"#F0F8E8",color:"#2E5818",fontSize:12,fontWeight:700,padding:"4px 14px",borderRadius:20}}>{payment.receipt_number}</span>
        </div>
        <div style={{borderTop:"1px solid #E0E0D4",paddingTop:12}}>
          {rows.map(([l,v])=><div key={l} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #E0E0D4",fontSize:13}}><span style={{color:"#6B6B60"}}>{l}</span><span style={{fontWeight:500}}>{v}</span></div>)}
          <div style={{display:"flex",justifyContent:"space-between",fontSize:16,fontWeight:700,padding:"12px 0 4px",borderTop:"2px solid #2E5818",marginTop:8,color:"#1B3A0C"}}><span>Amount paid</span><span>{fmt(payment.amount_paid)}</span></div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:13,color:balance<=0?"#2E5818":"#B91C1C",paddingTop:4,fontWeight:600}}><span>Remaining balance</span><span>{fmt(balance)}</span></div>
          {payment.edited_at&&<div style={{fontSize:11,color:"#9E6B08",marginTop:8,textAlign:"center"}}>This receipt was corrected on {payment.edited_at?.slice(0,10)} by {payment.edited_by}</div>}
        </div>
        <div style={{textAlign:"center",marginTop:12,fontSize:11,color:"#6B6B60",borderTop:"1px dashed #E0E0D4",paddingTop:10}}>Official receipt — Gratitude Bilingual Nursery & Primary School</div>
      </div>
      <div style={{marginTop:14}}>
        <div style={{fontSize:12,color:"#6B6B60",textAlign:"center",marginBottom:10,padding:"8px 12px",background:"#F5F5F0",borderRadius:7}}>
          <strong>To share:</strong> 1. Download the PDF below &nbsp;→&nbsp; 2. Open WhatsApp &amp; attach it
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
          <Btn variant="primary" onClick={()=>generateReceiptPDF(payment,student,balance).save("Receipt-"+(payment.receipt_number||"receipt")+".pdf")}>📥 Download PDF</Btn>
          {student&&student.phone
            ?<a href={"https://wa.me/"+(student.phone||"").replace(/[^0-9]/g,"")} target="_blank" rel="noreferrer" style={{padding:"7px 14px",fontSize:13,borderRadius:7,background:"#25D366",color:"#fff",fontWeight:600,textDecoration:"none",display:"inline-flex",alignItems:"center",gap:6}}>💬 WhatsApp {student.first_name||"Parent"}</a>
            :<a href="https://wa.me/" target="_blank" rel="noreferrer" style={{padding:"7px 14px",fontSize:13,borderRadius:7,background:"#25D366",color:"#fff",fontWeight:600,textDecoration:"none",display:"inline-flex",alignItems:"center",gap:6}}>💬 Open WhatsApp</a>
          }
          <Btn onClick={()=>window.print()}>🖨 Print</Btn>
        </div>
      </div>
    </div>
  );
}

function LoginScreen({onLogin}){
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  async function handleLogin(){
    if(!email||!password){setError("Please enter your email and password.");return;}
    setLoading(true);setError("");
    const {data,error:err}=await supabase.auth.signInWithPassword({email,password});
    if(err){setError(err.message);setLoading(false);return;}
    const {data:profile}=await supabase.from("profiles").select("*").eq("id",data.user.id).single();
    onLogin(data.user,profile);setLoading(false);
  }
  return(
    <div style={{minHeight:"100vh",background:"#F5F5F0",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{background:"#FFFFFF",borderRadius:12,padding:32,width:380,maxWidth:"100%",boxShadow:"0 8px 40px rgba(0,0,0,.12)"}}>
        <div style={{textAlign:"center",marginBottom:24}}>
          <img src="/logo.png" alt="Gratitude" style={{height:80,marginBottom:12}}/>
          <div style={{fontFamily:"Georgia,serif",fontSize:17,fontWeight:"bold",color:"#1B3A0C"}}>Gratitude Bilingual Nursery</div>
          <div style={{fontSize:12,color:"#6B6B60",marginTop:4}}>&amp; Primary School — Admin System</div>
        </div>
        {error&&<div style={{background:"#FEF2F2",color:"#B91C1C",padding:"9px 12px",borderRadius:7,fontSize:13,marginBottom:14}}>{error}</div>}
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <FG label="Email"><Input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="your@email.com" onKeyDown={e=>e.key==="Enter"&&handleLogin()}/></FG>
          <FG label="Password"><Input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&handleLogin()}/></FG>
          <button onClick={handleLogin} disabled={loading} style={{padding:"10px 14px",fontSize:14,background:"#2E5818",color:"#fff",border:"none",borderRadius:7,cursor:loading?"not-allowed":"pointer",fontWeight:600,opacity:loading?0.7:1,marginTop:4}}>
            {loading?"Signing in...":"Sign in"}
          </button>
        </div>
        <div style={{fontSize:11,color:"#6B6B60",textAlign:"center",marginTop:16}}>Contact your administrator to reset your password</div>
      </div>
    </div>
  );
}

function ClassListReport({students,payments,fees,academicYear,totalDue,totalPaid,balance}){
  const GRADES=["KG A","KG B","Grade 1","Grade 2","Grade 3","Grade 4","Grade 5","Grade 6"];
  const [selectedGrade,setSelectedGrade]=useState("all");
  const [showFees,setShowFees]=useState(false);
  const today_str=new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"long",year:"numeric"});
  const gradeOptions=["all",...GRADES.filter(g=>students.some(s=>s.grade===g))];
  const filtered=[...students]
    .filter(s=>selectedGrade==="all"||s.grade===selectedGrade)
    .sort((a,b)=>(a.last_name+" "+a.first_name).toLowerCase().localeCompare((b.last_name+" "+b.first_name).toLowerCase()));
  function fmtAmt(n){return"XAF "+Math.round(parseFloat(n||0)).toLocaleString();}

  function dlExcel(){
    const gradeLabel=selectedGrade==="all"?"All Classes":selectedGrade;
    const title=["Gratitude Bilingual Nursery & Primary School"];
    const sub=["Class List — "+gradeLabel+" — "+academicYear+" — Generated: "+today_str];
    const blank=[];
    let headers,rows;
    if(!showFees){
      headers=["#","Student Name","Gender","Student ID","Parent / Guardian","Phone","Status"];
      rows=filtered.map((s,i)=>[i+1,s.last_name+", "+s.first_name,s.gender||"—",s.student_code||"—",s.parent_name||"—",s.phone||"—",s.status==="active"?"Active":"Inactive"]);
      rows.push([]);rows.push(["","Total Students: "+filtered.length]);
    }else{
      headers=["#","Student Name","Gender","Student ID","Total Fees (XAF)","Paid (XAF)","Balance (XAF)","Status"];
      rows=filtered.map((s,i)=>[i+1,s.last_name+", "+s.first_name,s.gender||"—",s.student_code||"—",Math.round(totalDue(s.id)),Math.round(totalPaid(s.id)),Math.round(balance(s.id)),s.status==="active"?"Active":"Inactive"]);
      const tf=filtered.reduce((sum,s)=>sum+totalDue(s.id),0);
      const tp=filtered.reduce((sum,s)=>sum+totalPaid(s.id),0);
      const tb=filtered.reduce((sum,s)=>sum+balance(s.id),0);
      rows.push([]);rows.push(["","TOTALS","","",Math.round(tf),Math.round(tp),Math.round(tb)]);
      rows.push(["","Total Students: "+filtered.length]);
    }
    const ws=XLSX.utils.aoa_to_sheet([title,sub,blank,headers,...rows]);
    ws["!cols"]=showFees?[{wch:4},{wch:26},{wch:10},{wch:14},{wch:16},{wch:14},{wch:14},{wch:10}]:[{wch:4},{wch:26},{wch:10},{wch:14},{wch:22},{wch:16},{wch:10}];
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,gradeLabel.replace("/","_").slice(0,31));
    const wbout=XLSX.write(wb,{bookType:"xlsx",type:"array"});
    const blob=new Blob([wbout],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;a.download="ClassList_"+gradeLabel.replace(/ /g,"_")+"_"+academicYear+".xlsx";
    document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
  }

  function dlPDF(){
    const gradeLabel=selectedGrade==="all"?"All Classes":selectedGrade;
    const orient=showFees?"landscape":"portrait";
    const doc=new jsPDF({unit:"mm",format:"a4",orientation:orient});
    const pw=doc.internal.pageSize.getWidth();
    const ph=doc.internal.pageSize.getHeight();
    doc.setFont("helvetica","bold");doc.setFontSize(13);doc.setTextColor(27,58,12);
    doc.text("GRATITUDE BILINGUAL NURSERY & PRIMARY SCHOOL",pw/2,15,{align:"center"});
    doc.setFont("helvetica","normal");doc.setFontSize(9);doc.setTextColor(107,107,96);
    doc.text("Class List — "+gradeLabel+" — "+academicYear,pw/2,22,{align:"center"});
    doc.setFontSize(8);doc.text("Generated: "+today_str,pw/2,28,{align:"center"});
    doc.setDrawColor(200,210,190);doc.setLineWidth(0.4);doc.line(10,32,pw-10,32);
    const colW=showFees?[8,55,13,20,22,20,20,14]:[8,62,13,22,58,28,14];
    const hdrs=showFees?["#","Student Name","Gender","Student ID","Total Fees","Paid","Balance","Status"]:["#","Student Name","Gender","Student ID","Parent / Guardian","Phone","Status"];
    let y=40;const rh=7;
    const drawRow=(cells,isHdr,isTot)=>{
      if(y>ph-18){doc.addPage();y=20;doc.setFont("helvetica","italic");doc.setFontSize(8);doc.setTextColor(150,150,140);doc.text(gradeLabel+" — "+academicYear+" (cont.)",pw/2,14,{align:"center"});}
      if(isHdr){doc.setFillColor(240,248,232);doc.rect(10,y-5,pw-20,rh,"F");}
      else if(isTot){doc.setFillColor(245,245,240);doc.rect(10,y-5,pw-20,rh,"F");}
      doc.setFont("helvetica",isHdr||isTot?"bold":"normal");
      doc.setFontSize(isHdr?8.5:8);doc.setTextColor(isHdr?27:24,isHdr?58:24,isHdr?12:26);
      let x=12;
      cells.forEach((cell,ci)=>{
        const alignR=showFees&&ci>3&&ci<7;
        doc.text(String(cell||""),alignR?x+colW[ci]-3:x,y,{maxWidth:colW[ci]-2,align:alignR?"right":"left"});
        x+=colW[ci];
      });
      doc.setDrawColor(224,224,212);doc.setLineWidth(0.2);doc.line(10,y+2,pw-10,y+2);
      y+=rh;
    };
    drawRow(hdrs,true,false);
    filtered.forEach((s,i)=>{
      const cells=showFees
        ?[i+1,s.last_name+", "+s.first_name,s.gender||"—",s.student_code||"—",fmtAmt(totalDue(s.id)),fmtAmt(totalPaid(s.id)),fmtAmt(balance(s.id)),s.status==="active"?"Active":"Inactive"]
        :[i+1,s.last_name+", "+s.first_name,s.gender||"—",s.student_code||"—",s.parent_name||"—",s.phone||"—",s.status==="active"?"Active":"Inactive"];
      drawRow(cells,false,false);
    });
    if(showFees){
      const tf=filtered.reduce((sum,s)=>sum+totalDue(s.id),0);
      const tp=filtered.reduce((sum,s)=>sum+totalPaid(s.id),0);
      const tb=filtered.reduce((sum,s)=>sum+balance(s.id),0);
      drawRow(["","TOTALS","","",fmtAmt(tf),fmtAmt(tp),fmtAmt(tb),""],false,true);
    }
    y+=4;doc.setFont("helvetica","italic");doc.setFontSize(8);doc.setTextColor(107,107,96);
    doc.text("Total: "+filtered.length+" student"+(filtered.length!==1?"s":""),12,y);
    doc.text("Official — Gratitude BN&PS",pw-12,y,{align:"right"});
    doc.save("ClassList_"+gradeLabel.replace(/ /g,"_")+"_"+academicYear+".pdf");
  }

  const th={padding:"8px 12px",textAlign:"left",fontSize:11,fontWeight:600,color:"#6B6B60",borderBottom:"2px solid #E0E0D4",background:"#F0F8E8",textTransform:"uppercase",letterSpacing:"0.04em",whiteSpace:"nowrap"};
  const td={padding:"8px 12px",fontSize:12,borderBottom:"1px solid #F0F0E8",verticalAlign:"middle"};

  return(
    <div>
      <div style={{fontFamily:"Georgia,serif",fontSize:21,fontWeight:"bold",color:"#1B3A0C",marginBottom:20}}>📋 Class Lists</div>
      <Card style={{marginBottom:16}}>
        <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"flex-end"}}>
          <div>
            <div style={{fontSize:11,fontWeight:600,color:"#6B6B60",textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:5}}>Class / Grade</div>
            <select value={selectedGrade} onChange={e=>setSelectedGrade(e.target.value)} style={{padding:"8px 12px",border:"1px solid #E0E0D4",borderRadius:7,fontSize:13,fontFamily:"inherit",background:"#fff",minWidth:140}}>
              <option value="all">All Classes</option>
              {gradeOptions.filter(g=>g!=="all").map(g=><option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <div style={{fontSize:11,fontWeight:600,color:"#6B6B60",textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:5}}>Report Type</div>
            <div style={{display:"flex",borderRadius:7,overflow:"hidden",border:"1px solid #E0E0D4"}}>
              <button onClick={()=>setShowFees(false)} style={{padding:"8px 16px",fontSize:13,border:"none",cursor:"pointer",background:!showFees?"#2E5818":"#fff",color:!showFees?"#fff":"#1B3A0C",fontFamily:"inherit",fontWeight:500}}>Student List</button>
              <button onClick={()=>setShowFees(true)} style={{padding:"8px 16px",fontSize:13,border:"none",borderLeft:"1px solid #E0E0D4",cursor:"pointer",background:showFees?"#2E5818":"#fff",color:showFees?"#fff":"#1B3A0C",fontFamily:"inherit",fontWeight:500}}>With Fee Details</button>
            </div>
          </div>
          <div style={{flex:1}}/>
          <div style={{display:"flex",gap:8}}>
            <Btn onClick={dlExcel}>📥 Excel</Btn>
            <Btn variant="primary" onClick={dlPDF}>📄 PDF</Btn>
          </div>
        </div>
        <div style={{marginTop:10,fontSize:12,color:"#6B6B60"}}>
          Showing <strong>{filtered.length}</strong> student{filtered.length!==1?"s":""} sorted A–Z by surname{selectedGrade!=="all"?<> in <strong>{selectedGrade}</strong></>:""}
        </div>
      </Card>
      <Card>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>
              <th style={{...th,width:36}}>#</th>
              <th style={th}>Student Name</th>
              <th style={th}>Gender</th>
              <th style={th}>Student ID</th>
              {selectedGrade==="all"&&<th style={th}>Class</th>}
              {!showFees&&<><th style={th}>Parent / Guardian</th><th style={th}>Phone</th></>}
              {showFees&&<><th style={{...th,textAlign:"right"}}>Total Fees</th><th style={{...th,textAlign:"right"}}>Paid</th><th style={{...th,textAlign:"right"}}>Balance</th></>}
              <th style={th}>Status</th>
            </tr></thead>
            <tbody>
              {filtered.length===0&&<tr><td colSpan={9} style={{...td,textAlign:"center",color:"#6B6B60",padding:32}}>No students found.</td></tr>}
              {filtered.map((s,i)=>(
                <tr key={s.id} style={{background:i%2===0?"#fff":"#FAFAF8"}}>
                  <td style={{...td,color:"#6B6B60",fontSize:11}}>{i+1}</td>
                  <td style={{...td,fontWeight:600,color:"#1B3A0C"}}>{s.last_name}, {s.first_name}</td>
                  <td style={td}>{s.gender||"—"}</td>
                  <td style={{...td,fontSize:11,color:"#6B6B60"}}>{s.student_code||"—"}</td>
                  {selectedGrade==="all"&&<td style={td}><Badge color="blue">{s.grade}</Badge></td>}
                  {!showFees&&<><td style={td}>{s.parent_name||"—"}</td><td style={{...td,fontSize:11}}>{s.phone||"—"}</td></>}
                  {showFees&&<>
                    <td style={{...td,textAlign:"right"}}>{fmtAmt(totalDue(s.id))}</td>
                    <td style={{...td,textAlign:"right",color:"#2E5818"}}>{fmtAmt(totalPaid(s.id))}</td>
                    <td style={{...td,textAlign:"right",fontWeight:600,color:balance(s.id)<=0?"#2E5818":"#B91C1C"}}>{fmtAmt(balance(s.id))}</td>
                  </>}
                  <td style={td}><Badge color={s.status==="active"?"blue":"gray"}>{s.status==="active"?"Active":"Inactive"}</Badge></td>
                </tr>
              ))}
              {showFees&&filtered.length>0&&(()=>{
                const tf=filtered.reduce((s,x)=>s+totalDue(x.id),0);
                const tp=filtered.reduce((s,x)=>s+totalPaid(x.id),0);
                const tb=filtered.reduce((s,x)=>s+balance(x.id),0);
                return<tr style={{background:"#F0F8E8",borderTop:"2px solid #4A7C2F44"}}>
                  <td colSpan={4+(selectedGrade==="all"?1:0)} style={{...td,fontWeight:700,color:"#1B3A0C"}}>TOTALS — {filtered.length} students</td>
                  <td style={{...td,textAlign:"right",fontWeight:700}}>{fmtAmt(tf)}</td>
                  <td style={{...td,textAlign:"right",fontWeight:700,color:"#2E5818"}}>{fmtAmt(tp)}</td>
                  <td style={{...td,textAlign:"right",fontWeight:700,color:tb<=0?"#2E5818":"#B91C1C"}}>{fmtAmt(tb)}</td>
                  <td style={td}/>
                </tr>;
              })()}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function FileImportModal({onClose,onImported,academicYear}){
  const [students,setStudents]=useState([]);
  const [saving,setSaving]=useState(false);
  const [err,setErr]=useState("");
  const [fileName,setFileName]=useState("");
  const fileRef=useRef();
  const GRADES=["KG A","KG B","Grade 1","Grade 2","Grade 3","Grade 4","Grade 5","Grade 6"];

  function downloadTemplate(){
    const grades=['KG A','KG B','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6'];
    const note='# Valid Gender: Male, Female | Valid Class: '+grades.join(', ')+' | Valid Status: active, inactive';
    const headers=['First Name','Last Name','Date of Birth (YYYY-MM-DD)','Gender','Class','Parent Name','Phone Number','Status','Notes'];
    const sample1=['Jean','Dupont','2015-03-15','Male','Grade 1','Marie Dupont','237123456789','active',''];
    const sample2=['Amina','Bello','2016-07-22','Female','KG B','Ibrahim Bello','237987654321','active',''];
    const rows=[note,headers,sample1,sample2].map((r,i)=>i===0?r:r.map(v=>'"'+v+'"').join(','));
    const blob=new Blob([rows.join('\n')],{type:'text/csv'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download='Student_Import_Template.csv';
    document.body.appendChild(a);a.click();
    document.body.removeChild(a);URL.revokeObjectURL(url);
  }

  function mapRow(row){
    const k=key=>Object.keys(row).find(h=>h.toLowerCase().replace(/[^a-z]/g,"")===key.toLowerCase().replace(/[^a-z]/g,""));
    const g=key=>{const found=k(key);return found?String(row[found]||"").trim():"";};
    return{
      first_name:g("firstname")||g("first name"),
      last_name:g("lastname")||g("last name"),
      date_of_birth:g("dateofbirth")||g("dateofbirthyyyymmdd")||g("dob")||"",
      gender:g("gender")||g("gendermaleorfemale")||"",
      grade:g("class")||g("grade")||"",
      parent_name:g("parentname")||g("parent name")||g("parent")||"",
      phone:g("phonenumber")||g("phone number")||g("phone")||"",
      status:g("status")||g("statusactivityorinactive")||"active",
      notes:g("notes")||"",
    };
  }

  function parseRows(rawRows){
    return rawRows
      .map((row,i)=>({...mapRow(row),_id:Math.random().toString(36).slice(2),_row:i+2}))
      .filter(r=>r.first_name||r.last_name);
  }

  function handleFile(e){
    const file=e.target.files[0];
    if(!file)return;
    setErr("");setStudents([]);setFileName(file.name);
    const ext=file.name.split(".").pop().toLowerCase();
    if(ext==="csv"){
      Papa.parse(file,{
        header:true,skipEmptyLines:true,
        complete:res=>{
          const rows=parseRows(res.data);
          if(!rows.length){setErr("No student rows found. Check your file matches the template.");return;}
          setStudents(rows);
        },
        error:e=>setErr("CSV error: "+e.message)
      });
    } else if(ext==="xlsx"||ext==="xls"){
      const reader=new FileReader();
      reader.onload=ev=>{
        try{
          const wb=XLSX.read(ev.target.result,{type:"binary"});
          const ws=wb.Sheets[wb.SheetNames[0]];
          const data=XLSX.utils.sheet_to_json(ws);
          const rows=parseRows(data);
          if(!rows.length){setErr("No student rows found. Check your file matches the template.");return;}
          setStudents(rows);
        }catch(e){setErr("Excel error: "+e.message);}
      };
      reader.readAsBinaryString(file);
    } else {
      setErr("Only .csv, .xlsx or .xls files are supported.");
    }
  }

  function update(id,field,value){setStudents(s=>s.map(x=>x._id===id?{...x,[field]:value}:x));}
  function remove(id){setStudents(s=>s.filter(x=>x._id!==id));}

  async function saveAll(){
    const valid=students.filter(s=>s.first_name&&s.last_name&&s.grade);
    if(!valid.length){alert("No valid rows to import. Every student needs at least First Name, Last Name and Class.");return;}
    setSaving(true);
    const payload=valid.map(s=>({
      first_name:s.first_name.trim(),
      last_name:s.last_name.trim(),
      date_of_birth:s.date_of_birth||null,
      gender:s.gender||null,
      grade:s.grade,
      parent_name:s.parent_name||null,
      phone:s.phone||null,
      enrolled_at:today(),
      status:s.status==="inactive"?"inactive":"active",
      academic_year:academicYear,
      notes:s.notes||null,
    }));
    const{error}=await supabase.from("students").insert(payload);
    setSaving(false);
    if(error){alert("Error saving: "+error.message);return;}
    onImported(valid.length);
    onClose();
  }

  const valid=students.filter(s=>s.first_name&&s.last_name&&s.grade);

  return(
    <Modal open size="xl" onClose={onClose} title={"Import Students from CSV/Excel — "+academicYear}
      footer={students.length>0?<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" onClick={saveAll} disabled={saving}>{saving?"Saving...":"Import "+valid.length+" student"+(valid.length!==1?"s":"")}</Btn></>:null}>

      {/* Step 1 - Download template */}
      <div style={{display:"flex",gap:12,marginBottom:14,flexWrap:"wrap"}}>
        <div style={{flex:1,minWidth:240,padding:14,background:"#F0F8E8",borderRadius:8,border:"1px solid #4A7C2F33"}}>
          <div style={{fontSize:13,fontWeight:600,color:"#1B3A0C",marginBottom:4}}>Step 1 — Download the template</div>
          <div style={{fontSize:12,color:"#6B6B60",marginBottom:10}}>Fill it in with your students (Excel or Google Sheets), then upload below.</div>
          <Btn variant="primary" onClick={downloadTemplate}>📥 Download Template (with dropdowns)</Btn>
        </div>
        <div style={{flex:1,minWidth:240,padding:14,background:"#F5F5F0",borderRadius:8,border:"1px solid #E0E0D4"}}>
          <div style={{fontSize:13,fontWeight:600,color:"#1B3A0C",marginBottom:4}}>Step 2 — Upload your filled file</div>
          <div style={{fontSize:12,color:"#6B6B60",marginBottom:10}}>Accepts .xlsx, .xls or .csv files.</div>
          <Btn onClick={()=>fileRef.current?.click()}>📂 {fileName?"Change file: "+fileName:"Choose file"}</Btn>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{display:"none"}} onChange={handleFile}/>
        </div>
      </div>

      {/* Column guide */}
      {!students.length&&!err&&<div style={{padding:"10px 14px",background:"#FAFAF8",borderRadius:7,border:"1px solid #E0E0D4",marginBottom:14}}>
        <div style={{fontSize:11,fontWeight:600,color:"#6B6B60",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:6}}>Required columns in your file</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {[["First Name","required"],["Last Name","required"],["Class","required — KG A, KG B, Grade 1–6"],["Date of Birth","YYYY-MM-DD"],["Gender","Male or Female"],["Parent Name","optional"],["Phone Number","optional"],["Status","active or inactive"],["Notes","optional"]].map(([col,note])=>(
            <div key={col} style={{fontSize:11,padding:"3px 8px",borderRadius:4,background:note==="required"||note.startsWith("required")?"#F0F8E8":"#F0F0E8",color:note==="required"||note.startsWith("required")?"#2E5818":"#6B6B60",border:"1px solid "+(note==="required"||note.startsWith("required")?"#4A7C2F33":"#E0E0D4")}}>
              <strong>{col}</strong>{note!=="required"&&<span style={{fontWeight:400}}> — {note}</span>}
            </div>
          ))}
        </div>
      </div>}

      {/* Error */}
      {err&&<div style={{padding:"10px 14px",background:"#FEF2F2",color:"#B91C1C",borderRadius:7,marginBottom:14,fontSize:13}}>{err}</div>}

      {/* Preview table */}
      {students.length>0&&<div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <div style={{fontSize:13,fontWeight:600,color:"#1B3A0C"}}>{students.length} students found — review and correct before importing</div>
          <div style={{fontSize:12,color:"#6B6B60"}}>{valid.length} valid · {students.length-valid.length} missing required fields</div>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr>
              {["Row","First Name *","Last Name *","Class *","Date of Birth","Gender","Parent Name","Phone","Status",""].map(h=>(
                <th key={h} style={{textAlign:"left",padding:"7px 10px",fontSize:10,fontWeight:600,color:"#6B6B60",borderBottom:"1px solid #E0E0D4",background:"#F5F5F0",textTransform:"uppercase",letterSpacing:"0.04em",whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {students.map(s=>{
                const isValid=s.first_name&&s.last_name&&s.grade;
                return(
                  <tr key={s._id} style={{background:isValid?"":"#FEF2F2"}}>
                    <td style={{padding:"7px 10px",borderBottom:"1px solid #E0E0D4",fontSize:11,color:"#6B6B60"}}>{s._row}</td>
                    <td style={{padding:"4px 6px",borderBottom:"1px solid #E0E0D4"}}><input style={{width:90,padding:"3px 6px",border:"1px solid "+(s.first_name?"#E0E0D4":"#B91C1C"),borderRadius:5,fontSize:12,fontFamily:"inherit"}} value={s.first_name||""} onChange={e=>update(s._id,"first_name",e.target.value)}/></td>
                    <td style={{padding:"4px 6px",borderBottom:"1px solid #E0E0D4"}}><input style={{width:90,padding:"3px 6px",border:"1px solid "+(s.last_name?"#E0E0D4":"#B91C1C"),borderRadius:5,fontSize:12,fontFamily:"inherit"}} value={s.last_name||""} onChange={e=>update(s._id,"last_name",e.target.value)}/></td>
                    <td style={{padding:"4px 6px",borderBottom:"1px solid #E0E0D4"}}>
                      <select style={{padding:"3px 6px",border:"1px solid "+(s.grade?"#E0E0D4":"#B91C1C"),borderRadius:5,fontSize:12,fontFamily:"inherit"}} value={s.grade||""} onChange={e=>update(s._id,"grade",e.target.value)}>
                        <option value="">Select...</option>{GRADES.map(g=><option key={g}>{g}</option>)}
                      </select>
                    </td>
                    <td style={{padding:"4px 6px",borderBottom:"1px solid #E0E0D4"}}><input style={{width:100,padding:"3px 6px",border:"1px solid #E0E0D4",borderRadius:5,fontSize:12,fontFamily:"inherit"}} value={s.date_of_birth||""} onChange={e=>update(s._id,"date_of_birth",e.target.value)} placeholder="YYYY-MM-DD"/></td>
                    <td style={{padding:"4px 6px",borderBottom:"1px solid #E0E0D4"}}>
                      <select style={{padding:"3px 6px",border:"1px solid #E0E0D4",borderRadius:5,fontSize:12,fontFamily:"inherit"}} value={s.gender||""} onChange={e=>update(s._id,"gender",e.target.value)}>
                        <option value="">—</option><option>Male</option><option>Female</option>
                      </select>
                    </td>
                    <td style={{padding:"4px 6px",borderBottom:"1px solid #E0E0D4"}}><input style={{width:110,padding:"3px 6px",border:"1px solid #E0E0D4",borderRadius:5,fontSize:12,fontFamily:"inherit"}} value={s.parent_name||""} onChange={e=>update(s._id,"parent_name",e.target.value)} placeholder="Parent name"/></td>
                    <td style={{padding:"4px 6px",borderBottom:"1px solid #E0E0D4"}}><input style={{width:110,padding:"3px 6px",border:"1px solid #E0E0D4",borderRadius:5,fontSize:12,fontFamily:"inherit"}} value={s.phone||""} onChange={e=>update(s._id,"phone",e.target.value)} placeholder="237..."/></td>
                    <td style={{padding:"4px 6px",borderBottom:"1px solid #E0E0D4"}}>
                      <select style={{padding:"3px 6px",border:"1px solid #E0E0D4",borderRadius:5,fontSize:12,fontFamily:"inherit"}} value={s.status||"active"} onChange={e=>update(s._id,"status",e.target.value)}>
                        <option value="active">Active</option><option value="inactive">Inactive</option>
                      </select>
                    </td>
                    <td style={{padding:"4px 6px",borderBottom:"1px solid #E0E0D4"}}><button onClick={()=>remove(s._id)} style={{background:"none",border:"none",color:"#B91C1C",cursor:"pointer",fontSize:16,padding:0}}>×</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {students.length-valid.length>0&&<div style={{fontSize:12,color:"#B91C1C",marginTop:8}}>⚠ Rows highlighted in red are missing required fields (First Name, Last Name or Class). Fix them or remove them before importing.</div>}
      </div>}
    </Modal>
  );
}

function BulkScan({onClose,onImported,academicYear}){
  const [files,setFiles]=useState([]);
  const [previews,setPreviews]=useState([]);
  const [scanning,setScanning]=useState(false);
  const [students,setStudents]=useState([]);
  const [saving,setSaving]=useState(false);
  const [progress,setProgress]=useState("");
  const fileRef=useRef();

  function handleFiles(e){
    const selected=Array.from(e.target.files||[]);
    setFiles(selected);setPreviews(selected.map(f=>URL.createObjectURL(f)));setStudents([]);
  }

  async function scanAll(){
    if(!files.length)return;
    setScanning(true);setStudents([]);
    const all=[];
    for(let i=0;i<files.length;i++){
      setProgress(`Scanning page ${i+1} of ${files.length}...`);
      try{
        const b64=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result.split(",")[1]);r.onerror=rej;r.readAsDataURL(files[i]);});
        const resp=await fetch("/api/analyze-image",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({image:{data:b64,mediaType:files[i].type},type:"bulk_students"})});
        const result=await resp.json();
        if(result.success&&result.data){
          const extracted=Array.isArray(result.data)?result.data:[result.data];
          extracted.forEach(s=>all.push({...s,_page:i+1,_id:Math.random().toString(36).slice(2),parent_name:"",phone:"",status:"active"}));
        }
      }catch(e){console.error(e);}
    }
    setStudents(all);
    setProgress(`Found ${all.length} student${all.length!==1?"s":""} across ${files.length} page${files.length!==1?"s":""}`);
    setScanning(false);
  }

  function update(id,field,value){setStudents(s=>s.map(x=>x._id===id?{...x,[field]:value}:x));}
  function remove(id){setStudents(s=>s.filter(x=>x._id!==id));}

  async function saveAll(){
    const valid=students.filter(s=>s.firstName&&s.lastName&&s.grade);
    if(!valid.length){alert("No valid students to save.");return;}
    setSaving(true);
    const payload=valid.map(s=>({first_name:s.firstName,last_name:s.lastName,date_of_birth:s.dateOfBirth||null,gender:s.gender||null,grade:s.grade,parent_name:s.parent_name||null,phone:s.phone||null,enrolled_at:today(),status:"active",academic_year:academicYear,notes:null}));
    const {error}=await supabase.from("students").insert(payload);
    setSaving(false);
    if(error){alert("Error: "+error.message);return;}
    onImported(valid.length);onClose();
  }

  return(
    <Modal open size="xl" onClose={onClose} title={`AI Bulk Student Import — ${academicYear}`}
      footer={students.length>0?<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" onClick={saveAll} disabled={saving}>{saving?<><Spinner/>Saving...</>:`Save ${students.filter(s=>s.firstName&&s.lastName).length} students to database`}</Btn></>:null}>
      <div style={{marginBottom:14,padding:12,background:"#F0F8E8",borderRadius:8,border:"1px solid #4A7C2F33",fontSize:12,color:"#2E5818"}}>
        <strong>How it works:</strong> Photograph each page of the student register. Upload all photos at once. Claude reads every page and extracts all students automatically. Review, add parent contacts, then save all at once.
      </div>
      <div onClick={()=>fileRef.current?.click()} style={{border:`2px dashed #E0E0D4`,borderRadius:8,padding:24,textAlign:"center",cursor:"pointer",marginBottom:14,background:files.length?"#F0F8E8":"#F5F5F0"}}>
        <div style={{fontSize:28,marginBottom:6}}>📷</div>
        <div style={{fontSize:13,fontWeight:600,color:"#2E5818",marginBottom:4}}>{files.length?`${files.length} photo${files.length!==1?"s":""} ready to scan`:"Tap to take photos or upload from gallery"}</div>
        <div style={{fontSize:12,color:"#6B6B60"}}>Select multiple photos at once — up to 10 pages per batch</div>
        <input ref={fileRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={handleFiles}/>
      </div>
      {previews.length>0&&<div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>{previews.map((p,i)=><div key={i} style={{position:"relative"}}><img src={p} alt={`Page ${i+1}`} style={{width:80,height:80,objectFit:"cover",borderRadius:6,border:"1px solid #E0E0D4"}}/><div style={{position:"absolute",top:2,left:2,background:"rgba(0,0,0,.6)",color:"#fff",fontSize:10,padding:"1px 5px",borderRadius:4}}>P{i+1}</div></div>)}</div>}
      {files.length>0&&!students.length&&<Btn variant="primary" onClick={scanAll} disabled={scanning} style={{width:"100%",padding:"10px",fontSize:14,marginBottom:14}}>{scanning?`Scanning... ${progress}`:`Scan ${files.length} page${files.length!==1?"s":""} with AI`}</Btn>}
      {progress&&!scanning&&<div style={{fontSize:13,color:"#2E5818",fontWeight:600,marginBottom:12,padding:"8px 12px",background:"#F0F8E8",borderRadius:7}}>{progress}</div>}
      {students.length>0&&(
        <div>
          <div style={{fontSize:13,fontWeight:600,color:"#1B3A0C",marginBottom:8}}>Review all students — add parent contacts before saving</div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead><tr>{["Pg","First Name","Last Name","Class","Date of Birth","Gender","Parent Name","Phone",""].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {students.map(s=>(
                  <tr key={s._id}>
                    <td style={{...td,fontSize:11,color:"#6B6B60"}}>{s._page}</td>
                    <td style={td}><input style={{...inp,padding:"4px 7px",fontSize:12}} value={s.firstName||""} onChange={e=>update(s._id,"firstName",e.target.value)}/></td>
                    <td style={td}><input style={{...inp,padding:"4px 7px",fontSize:12}} value={s.lastName||""} onChange={e=>update(s._id,"lastName",e.target.value)}/></td>
                    <td style={td}><select style={{...inp,padding:"4px 7px",fontSize:12}} value={s.grade||""} onChange={e=>update(s._id,"grade",e.target.value)}><option value="">Select...</option>{GRADES.map(g=><option key={g}>{g}</option>)}</select></td>
                    <td style={td}><input style={{...inp,padding:"4px 7px",fontSize:12}} value={s.dateOfBirth||""} onChange={e=>update(s._id,"dateOfBirth",e.target.value)} placeholder="YYYY-MM-DD"/></td>
                    <td style={td}><select style={{...inp,padding:"4px 7px",fontSize:12}} value={s.gender||""} onChange={e=>update(s._id,"gender",e.target.value)}><option value="">—</option><option>Male</option><option>Female</option></select></td>
                    <td style={td}><input style={{...inp,padding:"4px 7px",fontSize:12}} value={s.parent_name||""} onChange={e=>update(s._id,"parent_name",e.target.value)} placeholder="Parent name"/></td>
                    <td style={td}><input style={{...inp,padding:"4px 7px",fontSize:12}} value={s.phone||""} onChange={e=>update(s._id,"phone",e.target.value)} placeholder="+237..."/></td>
                    <td style={td}><button onClick={()=>remove(s._id)} style={{background:"none",border:"none",color:"#B91C1C",cursor:"pointer",fontSize:18,padding:0}}>×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{fontSize:12,color:"#6B6B60",marginTop:8}}>Remove any incorrectly extracted rows before saving.</div>
        </div>
      )}
    </Modal>
  );
}

export default function App(){
  const [user,setUser]=useState(null);
  const [profile,setProfile]=useState(null);
  const [authLoading,setAuthLoading]=useState(true);
  const [page,setPage]=useState("dashboard");
  const [students,setStudents]=useState([]);
  const [fees,setFees]=useState([]);
  const [payments,setPayments]=useState([]);
  const [academicYears,setAcademicYears]=useState([]);
  const [currentYear,setCurrentYear]=useState("2025-2026");
  const [allUsers,setAllUsers]=useState([]);
  const [loading,setLoading]=useState(true);
  const [modal,setModal]=useState(null);
  const [form,setForm]=useState({});
  const [search,setSearch]=useState("");
  const [gFilter,setGFilter]=useState("");
  const [saving,setSaving]=useState(false);
  const [toast,setToast]=useState(null);
  const [showBulk,setShowBulk]=useState(false);
  const [showFileImport,setShowFileImport]=useState(false);

  useEffect(()=>{
    supabase.auth.getSession().then(async({data:{session}})=>{
      if(session?.user){const {data:p}=await supabase.from("profiles").select("*").eq("id",session.user.id).single();setUser(session.user);setProfile(p);}
      setAuthLoading(false);
    });
    const {data:{subscription}}=supabase.auth.onAuthStateChange(async(_,session)=>{
      if(session?.user){const {data:p}=await supabase.from("profiles").select("*").eq("id",session.user.id).single();setUser(session.user);setProfile(p);}
      else{setUser(null);setProfile(null);}
    });
    return()=>subscription.unsubscribe();
  },[]);

  useEffect(()=>{if(user)fetchAll();},[user,currentYear]);

  async function fetchAll(){
    setLoading(true);
    const[s,f,p,ay]=await Promise.all([
      supabase.from("students").select("*").eq("academic_year",currentYear).order("first_name"),
      supabase.from("fees").select("*").order("name"),
      supabase.from("payments").select("*").eq("academic_year",currentYear).order("created_at",{ascending:false}),
      supabase.from("academic_years").select("*").order("name"),
    ]);
    setStudents((s.data||[]).filter((v,i,a)=>a.findIndex(t=>t.id===v.id)===i));setFees((f.data||[]).filter((v,i,a)=>a.findIndex(t=>t.id===v.id)===i));setPayments((p.data||[]).filter((v,i,a)=>a.findIndex(t=>t.id===v.id)===i));setAcademicYears(ay.data||[]);
    if(profile?.role==="super_admin"){const{data:u}=await supabase.from("profiles").select("*").order("full_name");setAllUsers(u||[]);}
    setLoading(false);
  }

  const totalDue=useCallback(id=>{const st=students.find(x=>x.id===id);if(!st)return 0;return fees.filter(f=>f.grades==="all"||f.grades===st.grade).reduce((s,f)=>s+parseFloat(f.amount||0),0);},[students,fees]);
  const totalPaid=useCallback(id=>payments.filter(p=>p.student_id===id).reduce((s,p)=>s+parseFloat(p.amount_paid||0),0),[payments]);
  const balance=useCallback(id=>totalDue(id)-totalPaid(id),[totalDue,totalPaid]);

  const activeStudents=students.filter(s=>s.status==="active");
  const totalExpected=activeStudents.reduce((s,st)=>s+totalDue(st.id),0);
  const totalCollected=activeStudents.reduce((s,st)=>s+totalPaid(st.id),0);
  const collRate=totalExpected>0?Math.round(totalCollected/totalExpected*100):0;

  const showToast=msg=>{setToast(msg);setTimeout(()=>setToast(null),3000);};
  const openModal=(type,data={})=>{setForm({payment_date:today(),received_by:profile?.full_name||"Admin",method:"cash",status:"active",enrolled_at:today(),academic_year:currentYear,...data});setModal(type);};
  const closeModal=()=>{setModal(null);setForm({});};
  const ff=k=>e=>setForm(f=>({...f,[k]:e.target.value}));

  async function handleLogout(){await supabase.auth.signOut();setUser(null);setProfile(null);}

  async function saveStudent(){
    if(!form.first_name?.trim()||!form.last_name?.trim()||!form.grade){showToast("First name, last name and class are required.");return;}
    setSaving(true);
    const payload={first_name:form.first_name.trim(),last_name:form.last_name.trim(),date_of_birth:form.date_of_birth||null,gender:form.gender||null,grade:form.grade,parent_name:form.parent_name||null,phone:form.phone||null,enrolled_at:form.enrolled_at||today(),status:form.status||"active",academic_year:currentYear,notes:form.notes||null};
    const{error}=form.id?await supabase.from("students").update(payload).eq("id",form.id):await supabase.from("students").insert([payload]);
    setSaving(false);if(error){showToast("Error: "+error.message);return;}
    closeModal();fetchAll();showToast(form.id?"Student updated!":"Student added!");
  }

  async function saveFee(){
    if(!form.name?.trim()||!parseFloat(form.amount)){showToast("Name and amount required.");return;}
    setSaving(true);
    const payload={name:form.name.trim(),category:form.category||"tuition",term:form.term||"Term 1",grades:form.grades||"all",amount:parseFloat(form.amount)};
    const{error}=form.id?await supabase.from("fees").update(payload).eq("id",form.id):await supabase.from("fees").insert([payload]);
    setSaving(false);if(error){showToast("Error: "+error.message);return;}
    closeModal();fetchAll();showToast("Fee saved!");
  }

  async function savePayment(){
    if(!form.student_id||!parseFloat(form.amount_paid)||!form.payment_date){showToast("Student, amount and date required.");return;}
    setSaving(true);
    const feeObj=fees.find(f=>f.id===form.fee_id);
    const payload={student_id:form.student_id,fee_id:form.fee_id||null,fee_name:feeObj?`${feeObj.name} – ${feeObj.term}`:"General payment",amount_paid:parseFloat(form.amount_paid),payment_date:form.payment_date,method:form.method||"cash",received_by:form.received_by||"Admin",notes:form.notes||null,academic_year:currentYear};
    const{data,error}=await supabase.from("payments").insert([payload]).select().single();
    setSaving(false);if(error){showToast("Error: "+error.message);return;}
    await fetchAll();closeModal();openModal("receipt",{payment:data});showToast("Payment recorded!");
  }

  async function savePaymentEdit(){
    if(!form.reason?.trim()){showToast("Please provide a reason for this correction.");return;}
    if(!parseFloat(form.amount_paid)||!form.payment_date){showToast("Amount and date required.");return;}
    setSaving(true);
    const original=payments.find(p=>p.id===form.id);
    await supabase.from("payment_corrections").insert([{payment_id:form.id,corrected_by:profile?.full_name||"Admin",original_amount:original.amount_paid,new_amount:parseFloat(form.amount_paid),original_method:original.method,new_method:form.method,original_date:original.payment_date,new_date:form.payment_date,original_fee_name:original.fee_name,reason:form.reason}]);
    const feeObj=fees.find(f=>f.id===form.fee_id);
    await supabase.from("payments").update({amount_paid:parseFloat(form.amount_paid),payment_date:form.payment_date,method:form.method,fee_id:form.fee_id||null,fee_name:feeObj?`${feeObj.name} – ${feeObj.term}`:form.fee_name,notes:form.notes||null,edited_by:profile?.full_name||"Admin",edited_at:new Date().toISOString()}).eq("id",form.id);
    setSaving(false);closeModal();fetchAll();showToast("Payment corrected and logged!");
  }

  async function deleteStudent(id){
    if(payments.some(p=>p.student_id===id)){showToast("Cannot delete a student with payment records.");return;}
    await supabase.from("students").delete().eq("id",id);closeModal();fetchAll();showToast("Student removed.");
  }
  async function deleteFee(id){await supabase.from("fees").delete().eq("id",id);fetchAll();showToast("Fee removed.");}

  async function saveAcademicYear(){
    if(!form.year_name?.trim()){showToast("Year name required, e.g. 2026-2027");return;}
    const trimmed=form.year_name.trim();
    if(academicYears.some(y=>y.name===trimmed)){showToast("That academic year already exists.");return;}
    if(!/^\d{4}-\d{4}$/.test(trimmed)){showToast("Use format YYYY-YYYY, e.g. 2026-2027");return;}
    setSaving(true);
    const{error}=await supabase.from("academic_years").insert([{name:trimmed,is_current:!!form.set_current}]);
    if(!error&&form.set_current){
      await supabase.from("academic_years").update({is_current:false}).neq("name",trimmed);
      setCurrentYear(trimmed);
    }
    setSaving(false);
    if(error){showToast("Error: "+error.message);return;}
    closeModal();fetchAll();showToast("Academic year "+trimmed+" created!");
  }

  async function setYearAsCurrent(name){
    await supabase.from("academic_years").update({is_current:false}).neq("name",name);
    await supabase.from("academic_years").update({is_current:true}).eq("name",name);
    setCurrentYear(name);fetchAll();showToast(name+" is now the current year!");
  }

  if(authLoading)return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",color:"#2E5818",fontSize:16}}>Loading...</div>;
  if(!user||!profile)return <LoginScreen onLogin={(u,p)=>{setUser(u);setProfile(p);}}/>;
  if(loading)return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",color:"#2E5818",fontSize:16}}>Loading {currentYear}...</div>;

  const navItems=[{id:"dashboard",label:"Dashboard",show:true},{id:"students",label:"Students",show:can(profile.role,"students")},{id:"fees",label:"Fee Structure",show:can(profile.role,"fees")},{id:"payments",label:"Payments",show:can(profile.role,"payments")},{id:"reports",label:"Reports",show:can(profile.role,"reports")},
    {id:"class_lists",label:"📋 Class Lists",show:can(profile.role,"reports")},{id:"settings",label:"Settings",show:can(profile.role,"settings")}].filter(n=>n.show);

  return(
    <div style={{display:"flex",minHeight:"100vh",background:"#F5F5F0",fontFamily:"system-ui,-apple-system,sans-serif"}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Sidebar */}
      <div style={{width:200,background:"#1B3A0C",display:"flex",flexDirection:"column",flexShrink:0,position:"sticky",top:0,height:"100vh",overflowY:"auto"}}>
        <div style={{padding:"10px 12px",borderBottom:"1px solid rgba(255,255,255,.12)",textAlign:"center"}}>
          <img src="/logo.png" alt="Gratitude" style={{width:"100%",maxWidth:160,borderRadius:6,background:"#fff",padding:"5px"}}/>
          <div style={{fontSize:11,color:"rgba(255,255,255,.45)",marginTop:6}}>Admin System</div>
        </div>
        <div style={{padding:"8px 10px",borderBottom:"1px solid rgba(255,255,255,.1)"}}>
          <div style={{fontSize:10,color:"rgba(255,255,255,.4)",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.05em"}}>Academic Year</div>
          <select value={currentYear} onChange={e=>setCurrentYear(e.target.value)} style={{width:"100%",padding:"5px 8px",background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.2)",borderRadius:5,color:"#fff",fontSize:12,cursor:"pointer"}}>
            {academicYears.map(y=><option key={y.id} value={y.name} style={{background:"#1B3A0C"}}>{y.name}{y.is_current?" ★":""}</option>)}
          </select>
        </div>
        <nav style={{padding:"10px 0",flex:1}}>
          {navItems.map(n=><div key={n.id} onClick={()=>{setPage(n.id);setSearch("");}} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 16px",fontSize:13,color:page===n.id?"#fff":"rgba(255,255,255,.65)",cursor:"pointer",borderLeft:`3px solid ${page===n.id?"#7DBE4A":"transparent"}`,background:page===n.id?"rgba(255,255,255,.13)":"transparent"}}><div style={{width:7,height:7,borderRadius:"50%",background:page===n.id?"#7DBE4A":"rgba(255,255,255,.3)",flexShrink:0}}/>{n.label}</div>)}
        </nav>
        <div style={{padding:"10px 12px",borderTop:"1px solid rgba(255,255,255,.1)"}}>
          <div style={{fontSize:12,color:"#fff",fontWeight:500,marginBottom:2}}>{profile.full_name}</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,.4)",marginBottom:8}}>{ROLES[profile.role]||profile.role}</div>
          <button onClick={handleLogout} style={{width:"100%",padding:"5px 0",background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.2)",borderRadius:5,color:"rgba(255,255,255,.7)",fontSize:12,cursor:"pointer"}}>Sign out</button>
        </div>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:24,maxWidth:"calc(100vw - 200px)"}}>

        {/* DASHBOARD */}
        {page==="dashboard"&&<div>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:20}}>
            <div><div style={{fontFamily:"Georgia,serif",fontSize:21,fontWeight:"bold",color:"#1B3A0C"}}>Dashboard</div><div style={{fontSize:12,color:"#6B6B60",marginTop:3}}>{currentYear} · {new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div></div>
            {can(profile.role,"payments")&&<Btn variant="primary" onClick={()=>openModal("payment",{student_id:activeStudents[0]?.id||""})}>+ Record Payment</Btn>}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:18}}>
            {[{l:"Total students",v:activeStudents.length,c:"#1E40AF"},{l:"Total expected",v:fmt(totalExpected)},{l:"Collected",v:fmt(totalCollected),c:"#2E5818"},{l:"Outstanding",v:fmt(totalExpected-totalCollected),c:totalExpected-totalCollected>0?"#B91C1C":"#2E5818",prog:collRate}].map((st,i)=>(
              <div key={i} style={{background:"#FFFFFF",border:"1px solid #E0E0D4",borderRadius:10,padding:"14px 16px"}}>
                <div style={{fontSize:11,color:"#6B6B60",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:5}}>{st.l}</div>
                <div style={{fontSize:22,fontWeight:700,color:st.c||"#18181A"}}>{st.v}</div>
                {st.prog!=null&&<><Progress value={st.prog} color={collRate>80?"#4A7C2F":collRate>50?"#9E6B08":"#B91C1C"}/><div style={{fontSize:11,color:"#6B6B60",marginTop:4}}>{collRate}% collected</div></>}
              </div>
            ))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <Card><CardHeader>Collection by class — {currentYear}</CardHeader>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr><th style={th}>Class</th><th style={th}>Students</th><th style={th}>Paid</th><th style={th}>Balance</th><th style={th}>Rate</th></tr></thead>
                <tbody>
                  {GRADES.map(g=>{const sts=activeStudents.filter(x=>x.grade===g);if(!sts.length)return null;const due=sts.reduce((s,st)=>s+totalDue(st.id),0),paid=sts.reduce((s,st)=>s+totalPaid(st.id),0),r=due>0?Math.round(paid/due*100):0;return <tr key={g}><td style={td}>{g}</td><td style={td}>{sts.length}</td><td style={td}>{fmt(paid)}</td><td style={td}>{fmt(due-paid)}</td><td style={td}><Badge color={r>=80?"green":r>=50?"amber":"red"}>{r}%</Badge></td></tr>;})}
                  {!GRADES.some(g=>activeStudents.some(x=>x.grade===g))&&<tr><td colSpan={5} style={{...td,textAlign:"center",color:"#6B6B60"}}>No students yet</td></tr>}
                </tbody>
              </table>
            </Card>
            <Card><CardHeader>Recent payments</CardHeader>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr><th style={th}>Student</th><th style={th}>Amount</th><th style={th}>Date</th><th style={th}>Method</th></tr></thead>
                <tbody>
                  {payments.slice(0,7).map(p=>{const st=students.find(x=>x.id===p.student_id);return <tr key={p.id}><td style={td}>{st?`${st.first_name} ${st.last_name}`:"—"}</td><td style={{...td,color:"#2E5818",fontWeight:600}}>{fmt(p.amount_paid)}</td><td style={td}>{p.payment_date}</td><td style={td}><Badge color="gray">{METHODS[p.method]||p.method}</Badge></td></tr>;})}
                  {!payments.length&&<tr><td colSpan={4} style={{...td,textAlign:"center",color:"#6B6B60"}}>No payments yet</td></tr>}
                </tbody>
              </table>
            </Card>
          </div>
          <Card>
            <CardHeader action={<span style={{fontSize:12,fontWeight:400,color:"#6B6B60"}}>{activeStudents.filter(s=>balance(s.id)>0).length} students</span>}>Outstanding balances — {currentYear}</CardHeader>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr><th style={th}>Student</th><th style={th}>Class</th><th style={th}>Total due</th><th style={th}>Paid</th><th style={th}>Balance</th>{can(profile.role,"payments")&&<th style={th}></th>}</tr></thead>
              <tbody>
                {activeStudents.filter(s=>balance(s.id)>0).sort((a,b)=>balance(b.id)-balance(a.id)).map(s=>(
                  <tr key={s.id} style={{cursor:"pointer"}} onClick={()=>openModal("profile",{student:s})}>
                    <td style={td}><strong>{s.first_name} {s.last_name}</strong></td><td style={td}>{s.grade}</td><td style={td}>{fmt(totalDue(s.id))}</td><td style={{...td,color:"#2E5818"}}>{fmt(totalPaid(s.id))}</td><td style={{...td,color:"#B91C1C",fontWeight:700}}>{fmt(balance(s.id))}</td>
                    {can(profile.role,"payments")&&<td style={td}><Btn size="sm" variant="amber" onClick={e=>{e.stopPropagation();openModal("payment",{student_id:s.id});}}>Pay</Btn></td>}
                  </tr>
                ))}
                {!activeStudents.some(s=>balance(s.id)>0)&&<tr><td colSpan={6} style={{...td,textAlign:"center",color:"#6B6B60",padding:20}}>No outstanding balances!</td></tr>}
              </tbody>
            </table>
          </Card>
        </div>}

        {/* STUDENTS */}
        {page==="students"&&<div>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:20}}>
            <div><div style={{fontFamily:"Georgia,serif",fontSize:21,fontWeight:"bold",color:"#1B3A0C"}}>Student Register</div><div style={{fontSize:12,color:"#6B6B60",marginTop:3}}>{currentYear} · {activeStudents.length} active students</div></div>
            <div style={{display:"flex",gap:8}}>
              {can(profile.role,"bulk_import")&&<Btn variant="blue" onClick={()=>setShowBulk(true)}>📷 Bulk Import</Btn>}
              {can(profile.role,"bulk_import")&&<Btn onClick={()=>setShowFileImport(true)}>📄 CSV/Excel Import</Btn>}
              {can(profile.role,"students")&&<Btn variant="primary" onClick={()=>openModal("student")}>+ Add Student</Btn>}
            </div>
          </div>
          <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
            <input style={{...inp,flex:1,minWidth:180}} placeholder="Search by name or ID..." value={search} onChange={e=>setSearch(e.target.value)}/>
            <Sel value={gFilter} onChange={e=>setGFilter(e.target.value)} style={{...inp,width:"auto"}}><option value="">All classes</option>{GRADES.map(g=><option key={g}>{g}</option>)}</Sel>
          </div>
          <Card>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr><th style={th}>ID</th><th style={th}>Name</th><th style={th}>Class</th><th style={th}>Parent</th><th style={th}>Contact</th><th style={th}>Balance</th><th style={th}>Status</th>{can(profile.role,"students")&&<th style={th}></th>}</tr></thead>
              <tbody>
                {students.filter(st=>{const q=search.toLowerCase();return(!q||(st.first_name+" "+st.last_name+" "+(st.student_code||"")).toLowerCase().includes(q))&&(!gFilter||st.grade===gFilter);}).map(st=>{
                  const bal=balance(st.id);
                  return <tr key={st.id} style={{cursor:"pointer"}} onClick={()=>openModal("profile",{student:st})}>
                    <td style={{...td,fontFamily:"monospace",fontSize:12,color:"#6B6B60"}}>{st.student_code}</td>
                    <td style={td}><strong>{st.first_name} {st.last_name}</strong></td>
                    <td style={td}>{st.grade}</td><td style={td}>{st.parent_name||"—"}</td>
                    <td style={{...td,fontSize:12}}>{st.phone||"—"}</td>
                    <td style={td}><Badge color={bal<=0?"green":bal<50000?"amber":"red"}>{fmt(bal)}</Badge></td>
                    <td style={td}><Badge color={st.status==="active"?"blue":"gray"}>{st.status}</Badge></td>
                    {can(profile.role,"students")&&<td style={td}><Btn size="sm" onClick={e=>{e.stopPropagation();openModal("student",{...st});}}>Edit</Btn></td>}
                  </tr>;
                })}
                {!students.length&&<tr><td colSpan={8} style={{...td,textAlign:"center",color:"#6B6B60",padding:30}}>No students for {currentYear} yet. Use Bulk Import or Add Student.</td></tr>}
              </tbody>
            </table>
          </Card>
        </div>}

        {/* FEES */}
        {page==="fees"&&<div>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:20}}>
            <div><div style={{fontFamily:"Georgia,serif",fontSize:21,fontWeight:"bold",color:"#1B3A0C"}}>Fee Structure</div><div style={{fontSize:12,color:"#6B6B60",marginTop:3}}>{currentYear}</div></div>
            {can(profile.role,"fees")&&<Btn variant="primary" onClick={()=>openModal("fee",{category:"tuition",term:"Term 1",grades:"all"})}>+ Add Fee</Btn>}
          </div>
          <Card>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr><th style={th}>Fee name</th><th style={th}>Category</th><th style={th}>Term</th><th style={th}>Applies to</th><th style={th}>Amount (XAF)</th>{can(profile.role,"fees")&&<th style={th}></th>}</tr></thead>
              <tbody>
                {fees.map(f=><tr key={f.id}><td style={td}><strong>{f.name}</strong></td><td style={td}><Badge color="gray">{CATS[f.category]||f.category}</Badge></td><td style={td}>{f.term}</td><td style={td}>{f.grades==="all"?"All classes":f.grades}</td><td style={{...td,fontWeight:600}}>{fmt(f.amount)}</td>{can(profile.role,"fees")&&<td style={td}><div style={{display:"flex",gap:6}}><Btn size="sm" onClick={()=>openModal("fee",{...f})}>Edit</Btn><Btn size="sm" variant="danger" onClick={()=>deleteFee(f.id)}>Delete</Btn></div></td>}</tr>)}
                {!fees.length&&<tr><td colSpan={6} style={{...td,textAlign:"center",color:"#6B6B60",padding:30}}>No fees defined yet.</td></tr>}
              </tbody>
            </table>
          </Card>
          <Card><CardHeader>Summary — {currentYear}</CardHeader>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr><th style={th}>Class</th><th style={th}>Per student</th><th style={th}>Students</th><th style={th}>Total expected</th></tr></thead>
              <tbody>{GRADES.map(g=>{const sts=activeStudents.filter(x=>x.grade===g);if(!sts.length)return null;const per=fees.filter(f=>f.grades==="all"||f.grades===g).reduce((s,f)=>s+parseFloat(f.amount||0),0);return <tr key={g}><td style={td}>{g}</td><td style={{...td,fontWeight:600}}>{fmt(per)}</td><td style={td}>{sts.length}</td><td style={{...td,fontWeight:600,color:"#2E5818"}}>{fmt(per*sts.length)}</td></tr>;})}</tbody>
            </table>
          </Card>
        </div>}

        {/* PAYMENTS */}
        {page==="payments"&&<div>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:20}}>
            <div><div style={{fontFamily:"Georgia,serif",fontSize:21,fontWeight:"bold",color:"#1B3A0C"}}>Payments</div><div style={{fontSize:12,color:"#6B6B60",marginTop:3}}>{currentYear} · {payments.length} payments</div></div>
            {can(profile.role,"payments")&&<Btn variant="primary" onClick={()=>openModal("payment",{student_id:activeStudents[0]?.id||""})}>+ Record Payment</Btn>}
          </div>
          <div style={{display:"flex",gap:8,marginBottom:12}}><input style={{...inp,flex:1}} placeholder="Search by student name or receipt number..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
          <Card>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr><th style={th}>Receipt #</th><th style={th}>Student</th><th style={th}>Class</th><th style={th}>Fee</th><th style={th}>Amount</th><th style={th}>Date</th><th style={th}>Method</th><th style={th}>By</th><th style={th}></th></tr></thead>
              <tbody>
                {payments.filter(p=>{const st=students.find(x=>x.id===p.student_id);const q=search.toLowerCase();return!q||((st?`${st.first_name} ${st.last_name}`:"")+(p.receipt_number||"")).toLowerCase().includes(q);}).map(p=>{
                  const st=students.find(x=>x.id===p.student_id);
                  return <tr key={p.id} style={{background:p.edited_at?"#FFFBF0":""}}>
                    <td style={{...td,fontFamily:"monospace",fontSize:12,color:"#6B6B60"}}>{p.receipt_number}{p.edited_at&&<span style={{color:"#9E6B08",marginLeft:4}}>✏</span>}</td>
                    <td style={{...td,color:"#2E5818",fontWeight:500,cursor:"pointer"}} onClick={()=>openModal("profile",{student:st})}>{st?`${st.first_name} ${st.last_name}`:"—"}</td>
                    <td style={td}>{st?st.grade:"—"}</td><td style={{...td,fontSize:12}}>{p.fee_name||"—"}</td>
                    <td style={{...td,fontWeight:600}}>{fmt(p.amount_paid)}</td><td style={td}>{p.payment_date}</td>
                    <td style={td}><Badge color="gray">{METHODS[p.method]||p.method}</Badge></td>
                    <td style={{...td,fontSize:12}}>{p.received_by||"—"}</td>
                    <td style={td}><div style={{display:"flex",gap:4}}>
                      <Btn size="sm" onClick={()=>openModal("receipt",{payment:p})}>Receipt</Btn>
                      {can(profile.role,"edit_payments")&&<Btn size="sm" variant="amber" onClick={()=>openModal("edit_payment",{...p})}>Edit</Btn>}
                    </div></td>
                  </tr>;
                })}
                {!payments.length&&<tr><td colSpan={9} style={{...td,textAlign:"center",color:"#6B6B60",padding:30}}>No payments for {currentYear} yet.</td></tr>}
              </tbody>
            </table>
          </Card>
        </div>}

        {/* REPORTS */}
        {page==="reports"&&<div>
          <div style={{fontFamily:"Georgia,serif",fontSize:21,fontWeight:"bold",color:"#1B3A0C",marginBottom:4}}>Reports</div>
          <div style={{fontSize:12,color:"#6B6B60",marginBottom:20}}>{currentYear}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
            <Card><CardHeader>Payment method breakdown</CardHeader>
              <div style={{padding:14}}>{Object.entries(METHODS).map(([m,label])=>{const v=payments.filter(p=>p.method===m).reduce((s,p)=>s+parseFloat(p.amount_paid||0),0);const total=payments.reduce((s,p)=>s+parseFloat(p.amount_paid||0),0);const pct=total>0?Math.round(v/total*100):0;return <div key={m} style={{marginBottom:14}}><div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:4}}><span>{label}</span><span style={{fontWeight:600}}>{fmt(v)}</span></div><Progress value={pct}/><div style={{fontSize:11,color:"#6B6B60",marginTop:2}}>{pct}%</div></div>;})}
              {!payments.length&&<div style={{textAlign:"center",color:"#6B6B60",fontSize:13}}>No payments yet</div>}</div>
            </Card>
            <Card><CardHeader>Class collection rates</CardHeader>
              <div style={{padding:14}}>{GRADES.map(g=>{const sts=activeStudents.filter(x=>x.grade===g);if(!sts.length)return null;const due=sts.reduce((s,st)=>s+totalDue(st.id),0),paid=sts.reduce((s,st)=>s+totalPaid(st.id),0),r=due>0?Math.round(paid/due*100):0;return <div key={g} style={{marginBottom:14}}><div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:4}}><span>{g} <span style={{fontSize:11,color:"#6B6B60"}}>({sts.length})</span></span><span style={{fontWeight:600}}>{r}%</span></div><Progress value={r} color={r>=80?"#4A7C2F":r>=50?"#9E6B08":"#B91C1C"}/></div>;})}
              {!GRADES.some(g=>activeStudents.some(x=>x.grade===g))&&<div style={{textAlign:"center",color:"#6B6B60",fontSize:13}}>No data yet</div>}
              </div>
            </Card>
          </div>
          <Card>
            <CardHeader action={<span style={{fontSize:12,fontWeight:400,color:"#6B6B60"}}>{activeStudents.filter(x=>balance(x.id)>0).length} students · {fmt(activeStudents.filter(x=>balance(x.id)>0).reduce((s,x)=>s+balance(x.id),0))}</span>}>Fee defaulters — {currentYear}</CardHeader>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr><th style={th}>Student</th><th style={th}>Class</th><th style={th}>Parent contact</th><th style={th}>Balance due</th>{can(profile.role,"payments")&&<th style={th}></th>}</tr></thead>
              <tbody>
                {activeStudents.filter(x=>balance(x.id)>0).sort((a,b)=>balance(b.id)-balance(a.id)).map(st=>(
                  <tr key={st.id}><td style={td}><strong>{st.first_name} {st.last_name}</strong></td><td style={td}>{st.grade}</td><td style={{...td,fontSize:12}}>{st.phone||"—"}</td><td style={{...td,color:"#B91C1C",fontWeight:700}}>{fmt(balance(st.id))}</td>
                  {can(profile.role,"payments")&&<td style={td}><Btn size="sm" variant="amber" onClick={()=>openModal("payment",{student_id:st.id})}>Record payment</Btn></td>}
                  </tr>
                ))}
                {!activeStudents.some(x=>balance(x.id)>0)&&<tr><td colSpan={5} style={{...td,textAlign:"center",color:"#6B6B60",padding:20}}>No defaulters!</td></tr>}
              </tbody>
            </table>
          </Card>
        </div>}

        {/* SETTINGS */}
        {page==="settings"&&profile.role==="super_admin"&&<div>
          <div style={{fontFamily:"Georgia,serif",fontSize:21,fontWeight:"bold",color:"#1B3A0C",marginBottom:20}}>Settings</div>
          <Card>
            <CardHeader action={<Btn size="sm" variant="primary" onClick={()=>openModal("invite")}>+ Invite Staff</Btn>}>Staff accounts</CardHeader>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr><th style={th}>Name</th><th style={th}>Role</th><th style={th}>Status</th></tr></thead>
              <tbody>
                {allUsers.map(u=><tr key={u.id}><td style={td}>{u.full_name}</td><td style={td}><Badge color={u.role==="super_admin"?"blue":u.role==="registry_admin"?"green":"amber"}>{ROLES[u.role]||u.role}</Badge></td><td style={td}><Badge color={u.is_active?"green":"gray"}>{u.is_active?"Active":"Inactive"}</Badge></td></tr>)}
                {!allUsers.length&&<tr><td colSpan={3} style={{...td,textAlign:"center",color:"#6B6B60"}}>No users yet</td></tr>}
              </tbody>
            </table>
          </Card>
          <Card>
            <CardHeader action={<Btn size="sm" variant="primary" onClick={()=>openModal("new_year",{set_current:false})}>+ New Year</Btn>}>Academic years</CardHeader>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr><th style={th}>Year</th><th style={th}>Status</th><th style={th}></th></tr></thead>
              <tbody>
                {[...academicYears].sort((a,b)=>b.name.localeCompare(a.name)).map(y=>(
                  <tr key={y.id}>
                    <td style={{...td,fontWeight:600}}>{y.name}</td>
                    <td style={td}><Badge color={y.is_current?"blue":"gray"}>{y.is_current?"★ Current":"Past"}</Badge></td>
                    <td style={td}>{!y.is_current&&<Btn size="sm" variant="amber" onClick={()=>setYearAsCurrent(y.name)}>Set as Current</Btn>}</td>
                  </tr>
                ))}
                {!academicYears.length&&<tr><td colSpan={3} style={{...td,textAlign:"center",color:"#6B6B60"}}>No academic years yet</td></tr>}
              </tbody>
            </table>
          </Card>
        </div>}
      </div>

      {/* MODALS */}
      <Modal open={modal==="student"} onClose={closeModal} title={form.id?"Edit Student":"Add Student"}
        footer={<><Btn onClick={closeModal}>Cancel</Btn><Btn variant="primary" onClick={saveStudent} disabled={saving}>{saving?<><Spinner/>Saving...</>:form.id?"Save changes":"Add student"}</Btn></>}>
        <FormGrid>
          <FG label="First name *"><Input value={form.first_name||""} onChange={ff("first_name")} placeholder="e.g. Catherine"/></FG>
          <FG label="Last name *"><Input value={form.last_name||""} onChange={ff("last_name")} placeholder="e.g. Mani"/></FG>
          <FG label="Date of birth"><Input type="date" value={form.date_of_birth||""} onChange={ff("date_of_birth")}/></FG>
          <FG label="Gender"><Sel value={form.gender||""} onChange={ff("gender")}><option value="">Select...</option><option>Male</option><option>Female</option></Sel></FG>
          <FG label="Class / Grade *"><Sel value={form.grade||""} onChange={ff("grade")}><option value="">Select...</option>{GRADES.map(g=><option key={g}>{g}</option>)}</Sel></FG>
          <FG label="Enrollment date"><Input type="date" value={form.enrolled_at||""} onChange={ff("enrolled_at")}/></FG>
          <FG label="Parent / Guardian"><Input value={form.parent_name||""} onChange={ff("parent_name")} placeholder="Parent name"/></FG>
          <FG label="Contact number"><Input value={form.phone||""} onChange={ff("phone")} placeholder="+237..."/></FG>
          <FG label="Status" full><Sel value={form.status||"active"} onChange={ff("status")}><option value="active">Active</option><option value="inactive">Inactive</option></Sel></FG>
          <FG label="Notes" full><Input value={form.notes||""} onChange={ff("notes")} placeholder="Optional..."/></FG>
        </FormGrid>
      </Modal>

      {modal==="profile"&&form.student&&(()=>{
        const st=students.find(x=>x.id===form.student.id)||form.student;
        const due=totalDue(st.id),paid=totalPaid(st.id),bal=balance(st.id);
        const stuPayments=payments.filter(p=>p.student_id===st.id);
        const stuFees=fees.filter(f=>f.grades==="all"||f.grades===st.grade);
        return(
          <Modal open size="lg" onClose={closeModal} title="Student Profile"
            footer={<><Btn onClick={closeModal}>Close</Btn>{can(profile.role,"payments")&&<Btn variant="amber" onClick={()=>{closeModal();setTimeout(()=>openModal("payment",{student_id:st.id}),100);}}>Record Payment</Btn>}{can(profile.role,"students")&&<Btn variant="primary" onClick={()=>{closeModal();setTimeout(()=>openModal("student",{...st}),100);}}>Edit</Btn>}</>}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16,padding:14,background:"#F0F8E8",borderRadius:8}}>
              <div style={{width:48,height:48,borderRadius:"50%",background:"#D4EDBA",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700,color:"#2E5818",flexShrink:0}}>{inits(st)}</div>
              <div style={{flex:1}}>
                <div style={{fontFamily:"Georgia,serif",fontSize:16,fontWeight:"bold"}}>{st.first_name} {st.last_name}</div>
                <div style={{fontSize:12,color:"#6B6B60",marginTop:2}}>{st.student_code} · {st.grade} · {currentYear} · <Badge color={st.status==="active"?"blue":"gray"}>{st.status}</Badge></div>
                {st.parent_name&&<div style={{fontSize:12,color:"#6B6B60",marginTop:2}}>Parent: {st.parent_name}{st.phone?" · "+st.phone:""}</div>}
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:11,color:"#6B6B60"}}>Balance due</div>
                <div style={{fontSize:20,fontWeight:700,color:bal<=0?"#2E5818":"#B91C1C"}}>{fmt(bal)}</div>
                <div style={{fontSize:11,color:"#6B6B60"}}>{fmt(paid)} paid of {fmt(due)}</div>
              </div>
            </div>
            <div style={{fontWeight:600,fontSize:13,marginBottom:8,color:"#1B3A0C"}}>Fee ledger — {currentYear}</div>
            <Card style={{marginBottom:14}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr><th style={th}>Fee</th><th style={th}>Term</th><th style={th}>Amount</th></tr></thead>
                <tbody>
                  {stuFees.map(f=><tr key={f.id}><td style={td}>{f.name}</td><td style={td}>{f.term}</td><td style={td}>{fmt(f.amount)}</td></tr>)}
                  {!stuFees.length&&<tr><td colSpan={3} style={{...td,textAlign:"center",color:"#6B6B60"}}>No fees assigned</td></tr>}
                  {stuFees.length>0&&<tr style={{background:"#F0F8E8"}}><td style={{...td,fontWeight:600}} colSpan={2}>Total due</td><td style={{...td,fontWeight:700}}>{fmt(due)}</td></tr>}
                </tbody>
              </table>
            </Card>
            <div style={{fontWeight:600,fontSize:13,marginBottom:8,color:"#1B3A0C"}}>Payment history</div>
            <Card>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr><th style={th}>Receipt</th><th style={th}>Fee</th><th style={th}>Amount</th><th style={th}>Date</th><th style={th}>Method</th><th style={th}></th></tr></thead>
                <tbody>
                  {stuPayments.map(p=><tr key={p.id} style={{background:p.edited_at?"#FFFBF0":""}}><td style={{...td,fontFamily:"monospace",fontSize:11,color:"#6B6B60"}}>{p.receipt_number}{p.edited_at&&" ✏"}</td><td style={td}>{p.fee_name||"—"}</td><td style={{...td,color:"#2E5818",fontWeight:600}}>{fmt(p.amount_paid)}</td><td style={td}>{p.payment_date}</td><td style={td}>{METHODS[p.method]||p.method}</td><td style={td}><Btn size="sm" onClick={()=>openModal("receipt",{payment:p})}>View</Btn></td></tr>)}
                  {!stuPayments.length&&<tr><td colSpan={6} style={{...td,textAlign:"center",color:"#6B6B60"}}>No payments yet</td></tr>}
                  {stuPayments.length>0&&<tr style={{background:"#F0F8E8"}}><td colSpan={2} style={{...td,fontWeight:600}}>Total paid</td><td style={{...td,fontWeight:700,color:"#2E5818"}}>{fmt(paid)}</td><td colSpan={3}></td></tr>}
                </tbody>
              </table>
            </Card>
            {can(profile.role,"students")&&<div style={{marginTop:8}}><Btn variant="danger" onClick={()=>deleteStudent(st.id)}>Remove student</Btn></div>}
          </Modal>
        );
      })()}

      <Modal open={modal==="fee"} onClose={closeModal} title={form.id?"Edit Fee":"Add Fee"} size="sm"
        footer={<><Btn onClick={closeModal}>Cancel</Btn><Btn variant="primary" onClick={saveFee} disabled={saving}>{saving?<><Spinner/>Saving...</>:"Save fee"}</Btn></>}>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <FG label="Fee name *"><Input value={form.name||""} onChange={ff("name")} placeholder="e.g. Tuition Fee"/></FG>
          <FormGrid>
            <FG label="Category"><Sel value={form.category||"tuition"} onChange={ff("category")}>{Object.entries(CATS).map(([v,l])=><option key={v} value={v}>{l}</option>)}</Sel></FG>
            <FG label="Term"><Sel value={form.term||"Term 1"} onChange={ff("term")}>{TERMS.map(t=><option key={t}>{t}</option>)}</Sel></FG>
            <FG label="Amount (XAF) *"><Input type="number" step="1" value={form.amount||""} onChange={ff("amount")} placeholder="e.g. 50000"/></FG>
            <FG label="Applies to"><Sel value={form.grades||"all"} onChange={ff("grades")}><option value="all">All classes</option>{GRADES.map(g=><option key={g} value={g}>{g}</option>)}</Sel></FG>
          </FormGrid>
        </div>
      </Modal>

      {modal==="payment"&&(()=>{
        const selSt=students.find(x=>x.id===form.student_id);
        const appFees=fees.filter(f=>!selSt||f.grades==="all"||f.grades===selSt.grade);
        const bal=selSt?balance(selSt.id):null;
        return(
          <Modal open onClose={closeModal} title="Record Payment"
            footer={<><Btn onClick={closeModal}>Cancel</Btn><Btn variant="primary" onClick={savePayment} disabled={saving}>{saving?<><Spinner/>Saving...</>:"Save & generate receipt"}</Btn></>}>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <FG label="Student *"><Sel value={form.student_id||""} onChange={e=>setForm(f=>({...f,student_id:e.target.value,fee_id:""}))}>
                <option value="">Select student...</option>
                {activeStudents.sort((a,b)=>(a.first_name+a.last_name).localeCompare(b.first_name+b.last_name)).map(st=><option key={st.id} value={st.id}>{st.first_name} {st.last_name} ({st.grade})</option>)}
              </Sel></FG>
              {selSt&&bal!==null&&<div style={{padding:"9px 12px",background:"#F0F8E8",borderRadius:7,fontSize:13}}>Balance due: <strong style={{color:bal>0?"#B91C1C":"#2E5818"}}>{fmt(bal)}</strong> · Paid so far: {fmt(totalPaid(selSt.id))}</div>}
              <FG label="Fee item"><Sel value={form.fee_id||""} onChange={ff("fee_id")}>
                <option value="">— General / unspecified —</option>
                {appFees.map(f=><option key={f.id} value={f.id}>{f.name} – {f.term} ({fmt(f.amount)})</option>)}
              </Sel></FG>
              <FormGrid>
                <FG label="Amount paid (XAF) *"><Input type="number" step="1" value={form.amount_paid||""} onChange={ff("amount_paid")} placeholder="e.g. 50000"/></FG>
                <FG label="Date *"><Input type="date" value={form.payment_date||today()} onChange={ff("payment_date")}/></FG>
                <FG label="Payment method"><Sel value={form.method||"cash"} onChange={ff("method")}>{Object.entries(METHODS).map(([v,l])=><option key={v} value={v}>{l}</option>)}</Sel></FG>
                <FG label="Received by"><Input value={form.received_by||""} onChange={ff("received_by")}/></FG>
                <FG label="Notes" full><Input value={form.notes||""} onChange={ff("notes")} placeholder="Optional..."/></FG>
              </FormGrid>
            </div>
          </Modal>
        );
      })()}

      {modal==="edit_payment"&&(
        <Modal open onClose={closeModal} title="Correct Payment" size="sm"
          footer={<><Btn onClick={closeModal}>Cancel</Btn><Btn variant="amber" onClick={savePaymentEdit} disabled={saving}>{saving?<><Spinner/>Saving...</>:"Save correction"}</Btn></>}>
          <div style={{padding:"10px 12px",background:"#FEF6E0",borderRadius:7,fontSize:13,color:"#9E6B08",marginBottom:14,fontWeight:500}}>⚠ A correction record will be saved automatically for audit purposes.</div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <FG label="Fee item"><Sel value={form.fee_id||""} onChange={ff("fee_id")}><option value="">— General / unspecified —</option>{fees.map(f=><option key={f.id} value={f.id}>{f.name} – {f.term}</option>)}</Sel></FG>
            <FormGrid>
              <FG label="Amount paid (XAF) *"><Input type="number" step="1" value={form.amount_paid||""} onChange={ff("amount_paid")}/></FG>
              <FG label="Date *"><Input type="date" value={form.payment_date||""} onChange={ff("payment_date")}/></FG>
              <FG label="Payment method"><Sel value={form.method||"cash"} onChange={ff("method")}>{Object.entries(METHODS).map(([v,l])=><option key={v} value={v}>{l}</option>)}</Sel></FG>
              <FG label="Notes"><Input value={form.notes||""} onChange={ff("notes")}/></FG>
              <FG label="Reason for correction *" full><Input value={form.reason||""} onChange={ff("reason")} placeholder="e.g. Wrong amount entered..."/></FG>
            </FormGrid>
          </div>
        </Modal>
      )}

      {modal==="receipt"&&form.payment&&(()=>{
        const p=form.payment;const st=students.find(x=>x.id===p.student_id);const bal=st?balance(st.id):0;
        return <Modal open size="sm" onClose={closeModal} title="Payment Receipt"><Receipt payment={p} student={st} balance={bal}/></Modal>;
      })()}

      <Modal open={modal==="invite"} onClose={closeModal} title="Invite Staff Member" size="sm"
        footer={<><Btn onClick={closeModal}>Cancel</Btn><Btn variant="primary" onClick={async()=>{if(!form.inv_email?.trim()||!form.inv_name?.trim()||!form.inv_role){showToast("Email, name and role required.");return;}setSaving(true);const{error}=await fetch("/api/invite-user",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:form.inv_email,full_name:form.inv_name,role:form.inv_role})});setSaving(false);if(error){showToast("Error: "+error.message);return;}closeModal();showToast(`Invitation sent to ${form.inv_email}!`);}} disabled={saving}>{saving?<><Spinner/>Sending...</>:"Send invitation"}</Btn></>}>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <FG label="Full name *"><Input value={form.inv_name||""} onChange={ff("inv_name")} placeholder="e.g. Marie Nguyen"/></FG>
          <FG label="Email address *"><Input type="email" value={form.inv_email||""} onChange={ff("inv_email")} placeholder="staff@school.com"/></FG>
          <FG label="Role *"><Sel value={form.inv_role||""} onChange={ff("inv_role")}><option value="">Select role...</option><option value="registry_admin">Registry Admin — students only</option><option value="fee_admin">Fee Admin — fees &amp; payments only</option><option value="super_admin">Super Admin — full access</option></Sel></FG>
          <div style={{fontSize:12,color:"#6B6B60",padding:"8px 10px",background:"#F5F5F0",borderRadius:6}}>An invitation email will be sent. Staff will set their own password when they accept.</div>
        </div>
      </Modal>

      <Modal open={modal==="new_year"} onClose={closeModal} title="Create New Academic Year" size="sm"
        footer={<><Btn onClick={closeModal}>Cancel</Btn><Btn variant="primary" onClick={saveAcademicYear} disabled={saving}>{saving?<>Saving...</>:"Create year"}</Btn></>}>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <FG label="Academic year name *">
            <Input value={form.year_name||""} onChange={ff("year_name")} placeholder="e.g. 2026-2027"/>
            <div style={{fontSize:11,color:"#6B6B60",marginTop:4}}>Format: YYYY-YYYY</div>
          </FG>
          <div style={{display:"flex",alignItems:"flex-start",gap:10,padding:"12px",background:"#F0F8E8",borderRadius:7,cursor:"pointer",border:"1px solid #4A7C2F33"}} onClick={()=>setForm(f=>({...f,set_current:!f.set_current}))}>
            <div style={{width:18,height:18,border:"2px solid #2E5818",borderRadius:4,background:form.set_current?"#2E5818":"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
              {form.set_current&&<span style={{color:"#fff",fontSize:11,fontWeight:"bold",lineHeight:1}}>✓</span>}
            </div>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:"#1B3A0C"}}>Set as current year</div>
              <div style={{fontSize:11,color:"#6B6B60",marginTop:2}}>The sidebar selector and all new entries will default to this year. Previous current year will be set to Past.</div>
            </div>
          </div>
          {academicYears.length>0&&<div style={{fontSize:12,color:"#6B6B60",padding:"8px 10px",background:"#F5F5F0",borderRadius:6}}>Existing years: <strong>{academicYears.map(y=>y.name+(y.is_current?" ★":"")).join(", ")}</strong></div>}
        </div>
      </Modal>

      {page==="class_lists"&&<ClassListReport students={students} payments={payments} fees={fees} academicYear={currentYear} totalDue={totalDue} totalPaid={totalPaid} balance={balance}/>}

      {showFileImport&&<FileImportModal onClose={()=>setShowFileImport(false)} onImported={n=>{showToast(n+" students imported successfully!");fetchAll();}} academicYear={currentYear}/>}

      {showBulk&&<BulkScan onClose={()=>setShowBulk(false)} onImported={n=>{showToast(`${n} students imported!`);fetchAll();}} academicYear={currentYear}/>}

      {toast&&<div style={{position:"fixed",bottom:24,right:24,background:"#1B3A0C",color:"#fff",padding:"10px 18px",borderRadius:8,fontSize:13,fontWeight:500,zIndex:999,boxShadow:"0 4px 20px rgba(0,0,0,.25)"}}>{toast}</div>}
    </div>
  );
}
