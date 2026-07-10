// rest-check.mjs — ตรวจกฎวันหยุด: (1) ≤1 วัน/สัปดาห์/คน (2) ก่อนเริ่มงานไม่นับหยุด (3) ≤2 คนหยุด/วัน/สาขา
const SUPA='https://mbposllztajrwjjnfyvg.supabase.co';
const KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1icG9zbGx6dGFqcndqam5meXZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwOTE2MzYsImV4cCI6MjA5NDY2NzYzNn0.BF54zBwO2FaxN6ljANM7__Zsdi4jVFTQaEHvnfhAvDU';
async function rpc(name,args){ const r=await fetch(SUPA+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json'},body:JSON.stringify(args||{})});
  if(!r.ok) throw new Error(name+' '+r.status); const t=await r.text(); return t?JSON.parse(t):null; }
const SLOTS=['morning','mid','lunch','dinner','night'];
const DOW=['จ','อ','พ','พฤ','ศ','ส','อา'];
const all=await rpc('sched_all');
const brName={}; all.branches.forEach(b=>brName[b.id]=b.name);
const E={}; all.employees.forEach(e=>E[e.id]={name:e.name,br:brName[e.branchId],branchId:e.branchId,hiredAt:e.hiredAt});
const weeks=[['2026-07-06',['06','07','08','09','10','11','12']],['2026-07-13',['13','14','15','16','17','18','19']]];
for(const [wk,dates] of weeks){
  const g=(await rpc('sched_grid_get',{p_week:wk})); const grid=g.grid||g;
  const iso=dates.map(dd=>wk.slice(0,8)+dd);
  // work[id][d] = true ถ้ามีกะจริง (ไม่นับ off-helper)
  const work={};
  for(const b of all.branches){ for(let d=0;d<7;d++){ const dd=grid[b.id][d]||{}; for(const s of SLOTS){ for(const a of (dd[s]||[])){
    if(a.off) continue; (work[a.id]=work[a.id]||{})[d]=1; } } } }
  console.log('\n===== สัปดาห์ '+wk+' =====');
  // (1) หยุด >1 วัน/คน (เฉพาะวันหลังเริ่มงาน)
  const multiOff=[];
  Object.keys(E).forEach(id=>{ const e=E[id]; const offs=[];
    for(let d=0;d<7;d++){ const preHire = e.hiredAt && iso[d] < e.hiredAt;
      if(preHire) continue;                         // (2) ก่อนเริ่มงาน ไม่นับหยุด
      if(!(work[id]&&work[id][d])) offs.push(d); }
    if(offs.length>1) multiOff.push(`${e.name}(${e.br}) หยุด ${offs.length} วัน: ${offs.map(d=>DOW[d]).join(',')}${e.hiredAt&&e.hiredAt>=iso[0]&&e.hiredAt<=iso[6]?' [เริ่ม '+e.hiredAt.slice(8)+']':''}`); });
  console.log('(1) หยุดเกิน 1 วัน/สัปดาห์:', multiOff.length?'':'ไม่มี ✓');
  multiOff.forEach(x=>console.log('   ✗',x));
  // (3) หยุดพร้อมกัน >2 คน/วัน/สาขา
  const crowd=[];
  for(const b of all.branches){ const staff=all.employees.filter(e=>e.branchId===b.id);
    for(let d=0;d<7;d++){ const off=staff.filter(e=>{ const preHire=E[e.id].hiredAt && iso[d]<E[e.id].hiredAt;
      return !preHire && !(work[e.id]&&work[e.id][d]); });
      if(off.length>2) crowd.push(`${brName[b.id]} ${DOW[d]}: หยุด ${off.length} คน (${off.map(e=>e.name).join(',')})`); } }
  console.log('(3) หยุดพร้อมกันเกิน 2 คน/วัน:', crowd.length?'':'ไม่มี ✓');
  crowd.forEach(x=>console.log('   ✗',x));
  // สรุปหยุดต่อวันต่อสาขา
  for(const b of all.branches){ const staff=all.employees.filter(e=>e.branchId===b.id);
    const line=[]; for(let d=0;d<7;d++){ const off=staff.filter(e=>{ const preHire=E[e.id].hiredAt && iso[d]<E[e.id].hiredAt; return !preHire && !(work[e.id]&&work[e.id][d]); });
      line.push(DOW[d]+':'+off.length); }
    console.log('   '+brName[b.id]+' ('+staff.length+' คน) หยุด/วัน: '+line.join(' '));
  }
}
