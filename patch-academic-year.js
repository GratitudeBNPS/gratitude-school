// Gratitude School — Patch: Add Academic Year Management UI
// Run with: node patch-academic-year.js

const fs = require('fs');
const path = require('path');

const appPath = path.join(process.env.HOME, 'Downloads/gratitude-school/src/App.jsx');

if (!fs.existsSync(appPath)) {
  console.error('❌ Could not find App.jsx at:', appPath);
  process.exit(1);
}

let code = fs.readFileSync(appPath, 'utf8');
console.log('✅ App.jsx loaded. Applying patches...\n');

// ── PATCH 1: Add saveAcademicYear + setYearAsCurrent functions ────────────────
const deleteFeeTarget = `async function deleteFee(id){await supabase.from("fees").delete().eq("id",id);fetchAll();showToast("Fee removed.");}`;

if (!code.includes(deleteFeeTarget)) {
  console.error('❌ Patch 1 failed: Could not find deleteFee function. Has the file been modified?');
  process.exit(1);
}

const newFunctions = `async function deleteFee(id){await supabase.from("fees").delete().eq("id",id);fetchAll();showToast("Fee removed.");}

  async function saveAcademicYear(){
    if(!form.year_name?.trim()){showToast("Year name required, e.g. 2026-2027");return;}
    const trimmed=form.year_name.trim();
    if(academicYears.some(y=>y.name===trimmed)){showToast("That academic year already exists.");return;}
    if(!/^\\d{4}-\\d{4}$/.test(trimmed)){showToast("Use format YYYY-YYYY, e.g. 2026-2027");return;}
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
  }`;

code = code.replace(deleteFeeTarget, newFunctions);
console.log('✅ Patch 1 applied: saveAcademicYear + setYearAsCurrent functions added.');

// ── PATCH 2: Update Settings — Academic years card ─────────────────────────────
const oldYearsCard = `<Card>
            <CardHeader>Academic years</CardHeader>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr><th style={th}>Year</th><th style={th}>Status</th></tr></thead>
              <tbody>{academicYears.map(y=><tr key={y.id}><td style={td}>{y.name}</td><td style={td}><Badge color={y.is_current?"blue":"gray"}>{y.is_current?"Current":"Past"}</Badge></td></tr>)}</tbody>
            </table>
          </Card>`;

const newYearsCard = `<Card>
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
          </Card>`;

if (!code.includes(oldYearsCard)) {
  console.error('❌ Patch 2 failed: Could not find the Academic years card. Has the Settings section been modified?');
  process.exit(1);
}

code = code.replace(oldYearsCard, newYearsCard);
console.log('✅ Patch 2 applied: Academic years card updated with + New Year button and Set as Current.');

// ── PATCH 3: Add "Create Academic Year" modal ──────────────────────────────────
const bulkScanTarget = `{showBulk&&<BulkScan onClose={()=>setShowBulk(false)}`;

if (!code.includes(bulkScanTarget)) {
  console.error('❌ Patch 3 failed: Could not find BulkScan component. Has the file been modified?');
  process.exit(1);
}

const newYearModal = `<Modal open={modal==="new_year"} onClose={closeModal} title="Create New Academic Year" size="sm"
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

      `;

code = code.replace(bulkScanTarget, newYearModal + bulkScanTarget);
console.log('✅ Patch 3 applied: Create Academic Year modal added.\n');

// ── Write updated file ─────────────────────────────────────────────────────────
fs.writeFileSync(appPath, code);

console.log('🎉 All patches applied successfully!');
console.log('');
console.log('Next step — push to GitHub:');
console.log('  cd ~/Downloads/gratitude-school && git add . && git commit -m "Add academic year management UI" && git push');
console.log('');
console.log('What the update adds:');
console.log('  • Settings → Academic Years → "+ New Year" button');
console.log('  • Modal to create a new year with optional "Set as Current" toggle');
console.log('  • "Set as Current" button on each past year row');
console.log('  • Years sorted newest first in the Settings table');
