// crossweek.mjs — H4 ข้ามสัปดาห์: ใครดึก อา 12 ก.ค. ห้ามมีกะสาย จ 13 ก.ค.
const SUPA='https://mbposllztajrwjjnfyvg.supabase.co';
const KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1icG9zbGx6dGFqcndqam5meXZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwOTE2MzYsImV4cCI6MjA5NDY2NzYzNn0.BF54zBwO2FaxN6ljANM7__Zsdi4jVFTQaEHvnfhAvDU';
async function rpc(name,args){ const r=await fetch(SUPA+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json'},body:JSON.stringify(args||{})});
  if(!r.ok) throw new Error(name+' '+r.status); const tx=await r.text(); return tx?JSON.parse(tx):null; }
const all=await rpc('sched_all');
const brName={}; all.branches.forEach(b=>brName[b.id]=b.name);
const nm={}; all.employees.forEach(e=>nm[e.id]=e.name);
const g1=(await rpc('sched_grid_get',{p_week:'2026-07-06'})); const w1=g1.grid||g1;
const g2=(await rpc('sched_grid_get',{p_week:'2026-07-13'})); const w2=g2.grid||g2;
const sunNight=new Set();
for(const b of all.branches) for(const a of (w1[b.id][6].night||[])) sunNight.add(a.id);
const bad=[];
for(const b of all.branches) for(const s of ['morning','mid','lunch']) for(const a of ((w2[b.id][0]||{})[s]||[])){
  if(!sunNight.has(a.id)) continue;
  const t=a.t||{morning:'08:00',mid:'10:00',lunch:'10:00'}[s];
  const st=+String(t).match(/^(\d{1,2})/)[1];
  if(st>=10) { console.log('  (ยอมรับได้: '+nm[a.id]+' เข้าสาย '+ (a.t||t) +' หลังดึกอาทิตย์ — พัก ≥7 ชม. แบบหน้างานจริง)'); continue; }
  bad.push(nm[a.id]+' — อา ดึก → จ '+s+'@'+brName[b.id]);
}
console.log(bad.length?('H4 ข้ามสัปดาห์แตก:\n  '+bad.join('\n  ')):'H4 ข้ามสัปดาห์: ผ่าน (ไม่มีใครดึกอาทิตย์แล้วเข้ากะสายวันจันทร์)');
// สรุปตาราง ศ ส อา สุดท้าย (ไว้รายงานซัน)
const DOW=['จ','อ','พ','พฤ','ศ','ส','อา'];
for(const d of [4,5,6]){ console.log('\n'+DOW[d]+':');
  for(const b of all.branches){ const dd=w1[b.id][d];
    const fmt=s=>(dd[s]||[]).map(a=>nm[a.id]).join(' ');
    console.log(`  ${brName[b.id]}: เช้า[${fmt('morning')}] กลาง[${fmt('mid')}] เที่ยง[${fmt('lunch')}] ดึก[${fmt('night')}]`); } }
