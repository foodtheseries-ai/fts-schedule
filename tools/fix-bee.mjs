// fix-bee.mjs — บีติด H4 (กะดึกกระจาย) → จัดใหม่ให้ดึกติดกัน (พฤ,ศ,ส) + เช้า จ,อ,พ + หยุด อา
// ตัวแทนอุดช่องที่บีเคยคุม แล้วตรวจไม่ให้เกิดรู/กฎแตก
const SUPA='https://mbposllztajrwjjnfyvg.supabase.co';
const KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1icG9zbGx6dGFqcndqam5meXZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwOTE2MzYsImV4cCI6MjA5NDY2NzYzNn0.BF54zBwO2FaxN6ljANM7__Zsdi4jVFTQaEHvnfhAvDU';
const PIN='7788'; const DRY=process.argv.includes('--dry');
async function rpc(n,a){const r=await fetch(SUPA+'/rest/v1/rpc/'+n,{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json'},body:JSON.stringify(a||{})});if(!r.ok)throw new Error(n+' '+r.status+' '+await r.text());const t=await r.text();return t?JSON.parse(t):null;}
const SLOTS=['morning','mid','lunch','dinner','night'],DOW=['จ','อ','พ','พฤ','ศ','ส','อา'];
const PBK={p22:{m:0,mid:0,n:0},p313:{m:0,mid:1,n:0},p314:{m:0,mid:1,n:1},p34:{m:0,mid:0,n:1},p43:{m:1,mid:0,n:0},p44:{m:1,mid:0,n:1}};
const PEAK={0:1,1:1,2:1,5:1,6:1};
const all=await rpc('sched_all');const brName={};all.branches.forEach(b=>brName[b.id]=b.name);const nm={};all.employees.forEach(e=>nm[e.id]=e.name);
const brPlan={};all.branches.forEach(b=>brPlan[b.id]=b.plan||{});
const E={};all.employees.forEach(e=>{const ps={};(e.preferredSlots||[]).forEach(s=>ps[s]=1);const none=!(ps.morning||ps.mid||ps.late);
  E[e.id]={id:e.id,name:e.name,branchId:e.branchId,positions:e.positions||[],aM:none||!!ps.morning,aMid:none||!!ps.mid,aL:none||!!ps.late,loanOk:!!e.loanOk,canOt:!!e.canOt,canSplit:!!e.canSplit,cg:e.commuteGroup||null,hiredAt:e.hiredAt};});
const byName={};Object.values(E).forEach(e=>byName[e.name]=e);
const PYT=all.branches.find(b=>brName[b.id]==='พญาไท').id, SKV=all.branches.find(b=>brName[b.id]==='สุขุมวิท 77').id;
function demandOf(plan,d){plan=plan||{};let m=plan.cook_m||0,n=plan.cook_n||0,peak=plan.cook_mid||0;const dp=plan.dayPlans&&plan.dayPlans[d]!==undefined?PBK[plan.dayPlans[d]]:null;if(dp){m=dp.m;peak=dp.mid;n=dp.n;}else if(!PEAK[d])peak=0;return {morning:{cook:1+m,kasst:1,cash:1},night:{cook:1+n,kasst:1,cash:1},mid:peak};}
function canLoanTo(e,bid){if(brName[bid]==='พญาไท')return false;if(brName[e.branchId]==='พญาไท')return true;if(e.cg&&(brName[bid]==='สาทร'||brName[bid]==='สุขุมวิท 77'))return true;return false;}

const g=(await rpc('sched_grid_get',{p_week:'2026-07-13'}));const grid=g.grid||g;
const cellsOf=(id,d)=>{const o=[];for(const b of all.branches)for(const s of SLOTS)for(const a of (grid[b.id][d][s]||[]))if(a.id===id)o.push({bid:b.id,slot:s,a});return o;};
const nightOn=(id,d)=>d<0?false:cellsOf(id,d).some(x=>x.slot==='night');
const earlyOn=(id,d)=>d>6?false:cellsOf(id,d).some(x=>['morning','mid','lunch'].includes(x.slot));
const busy=(id,d)=>cellsOf(id,d).length>0;
const cover=(bid,d,slot,pos)=>(grid[bid][d][slot]||[]).filter(a=>a.pos===pos).length;
const rm=(bid,d,slot,id)=>{grid[bid][d][slot]=grid[bid][d][slot].filter(a=>a.id!==id);};
const add=(bid,d,slot,id,pos,homeB)=>{grid[bid][d][slot].push({id,pos,via:homeB!==bid?'loan':'home',homeBranch:homeB,locked:true});};
function eligible(e,bid,d,slot,pos){
  if(busy(e.id,d))return 'busy'; if(e.positions.indexOf(pos)<0)return 'pos';
  const av=slot==='morning'?e.aM:slot==='night'?e.aL:slot==='mid'?(e.aM||e.aMid):e.canSplit; if(!av)return 'avail';
  if(['morning','mid','lunch'].includes(slot)&&nightOn(e.id,d-1))return 'H4prev';
  if(slot==='night'&&earlyOn(e.id,d+1))return 'H4next';
  const loan=e.branchId!==bid; if(loan&&(!e.loanOk||!canLoanTo(e,bid)))return 'loanDir';
  return null;
}
const B=byName['บี'];
console.log('บี ปัจจุบัน:');for(let d=0;d<7;d++)console.log(' ',DOW[d],cellsOf(B.id,d).map(x=>x.slot+'@'+brName[x.bid].slice(0,3)+'/'+x.a.pos).join(',')||'หยุด');

// เป้าหมาย: บี = จ-เช้า(พญา), อ-เช้า(พญา), พ-เช้า(คงที่ที่เดิม), พฤ-ดึก(คง), ศ-ดึก(คง), ส-ดึก(พญา), หยุด อา
// ต้องเอาออก: จ-ดึก(บี), อา-เช้า(บี@สุข) · เพิ่ม: จ-เช้า, อ-เช้า, ส-ดึก (พญา)
// ช่องที่ต้องหาตัวแทน: จ-ดึก-kasst พญา, อา-เช้า-kasst สุข
const plan=[];
// snapshot บี cells
const beeCells={};for(let d=0;d<7;d++)beeCells[d]=cellsOf(B.id,d);
// 1) เอาบีออกจาก จ-night, อา-morning(สุข)
const jaNight=beeCells[0].find(x=>x.slot==='night'); const aaMorn=beeCells[6].find(x=>x.slot==='morning');
if(!jaNight||!aaMorn){console.log('โครงสร้างบีไม่ตรงคาด — หยุด');process.exit(0);}
// หาตัวแทน จ-night kasst ที่พญาไท (คนพญาไทว่าง จ ดึก ทำ kasst ได้ · ไม่ติด H4)
const subJa = Object.values(E).find(e=>e.id!==B.id && eligible(e,PYT,0,'night','kasst')===null);
// ตัวแทน อา-morning kasst สุข (คนว่าง อา เช้า ทำ kasst สุขได้)
const subAa = Object.values(E).find(e=>e.id!==B.id && eligible(e,SKV,6,'morning','kasst')===null);
console.log('ตัวแทน จ-ดึก-kasst พญา:', subJa?nm[subJa.id]:'ไม่มี','· อา-เช้า-kasst สุข:', subAa?nm[subAa.id]:'ไม่มี');
if(!subJa||!subAa){console.log('หาตัวแทนไม่ครบ → บีแก้ไม่ได้แบบนี้ (ต้อง rework ใหญ่)');process.exit(0);}
// ทำจริงบน grid ชั่วคราว
rm(jaNight.bid,0,'night',B.id); add(PYT,0,'night',subJa.id,'kasst',subJa.branchId);
rm(aaMorn.bid,6,'morning',B.id); add(SKV,6,'morning',subAa.id,'kasst',subAa.branchId);
// เพิ่มบี: จ-เช้า, อ-เช้า (พญา), ส-ดึก (พญา)
for(const [d,slot] of [[0,'morning'],[1,'morning'],[5,'night']]){
  const why=eligible(B,PYT,d,slot,'kasst');
  if(why){console.log('บี '+DOW[d]+' '+slot+' ใส่ไม่ได้: '+why+' → ยกเลิกทั้งหมด');process.exit(0);}
  add(PYT,d,slot,B.id,'kasst',B.branchId);
}
console.log('\nบี หลังจัด:');for(let d=0;d<7;d++)console.log(' ',DOW[d],cellsOf(B.id,d).map(x=>x.slot+'@'+brName[x.bid].slice(0,3)).join(',')||'หยุด');
// ===== ตรวจ: ไม่เกิดรูใหม่ + ไม่กฎแตก =====
let holes=0;for(const b of all.branches)for(let d=0;d<7;d++){const dm=demandOf(brPlan[b.id],d);
  ['morning','night'].forEach(s=>['cook','kasst','cash'].forEach(p=>{if(cover(b.id,d,s,p)<(dm[s][p]||0))holes++;}));}
console.log('รูรวมทั้งเครือหลังจัด:',holes,'(เทียบก่อนหน้า ~1)');
if(!DRY){await rpc('sched_grid_save',{p_week:'2026-07-13',p_grid:grid,p_pin:PIN});console.log('บันทึกแล้ว');}else console.log('(dry)');
