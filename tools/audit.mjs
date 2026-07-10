// audit.mjs — deep audit ของตารางจริง 2 สัปดาห์ (mirror กฎ engine v15 เป๊ะ)
const SUPA='https://mbposllztajrwjjnfyvg.supabase.co';
const KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1icG9zbGx6dGFqcndqam5meXZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwOTE2MzYsImV4cCI6MjA5NDY2NzYzNn0.BF54zBwO2FaxN6ljANM7__Zsdi4jVFTQaEHvnfhAvDU';
async function rpc(name,args){ const r=await fetch(SUPA+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json'},body:JSON.stringify(args||{})});
  if(!r.ok) throw new Error(name+' '+r.status+' '+await r.text()); return r.json(); }

const SLOTM={morning:{time:'08:00-18:00',hours:10},mid:{time:'10:00-20:00',hours:10,peak:1},lunch:{time:'10:00-14:00',hours:4,peak:1,splitOnly:1},dinner:{time:'17:00-21:00',hours:4,peak:1,splitOnly:1},night:{time:'17:00-03:00',hours:10}};
const SLOTS=['morning','mid','lunch','dinner','night'];
const PLAN_BY_KEY={p22:{m:0,mid:0,n:0},p313:{m:0,mid:1,n:0},p314:{m:0,mid:1,n:1},p34:{m:0,mid:0,n:1},p43:{m:1,mid:0,n:0},p44:{m:1,mid:0,n:1}};
const PEAK_DAYS={0:1,1:1,2:1,5:1,6:1};
const DOW=['จ','อ','พ','พฤ','ศ','ส','อา'];
function demandOf(plan,d){ plan=plan||{}; let m=plan.cook_m||0,n=plan.cook_n||0,peak=plan.cook_mid||0;
  const dp=(d!==undefined)&&plan.dayPlans&&plan.dayPlans[d]!==undefined?PLAN_BY_KEY[plan.dayPlans[d]]:null;
  if(dp){m=dp.m;peak=dp.mid;n=dp.n;} else if(d!==undefined&&!PEAK_DAYS[d]) peak=0;
  return {morning:{cook:1+m,kasst:1,cash:1},mid:{cook:peak,kasst:0,cash:0},lunch:{cook:0,kasst:0,cash:0},dinner:{cook:0,kasst:0,cash:0},night:{cook:1+n,kasst:1,cash:1}}; }
function intervalOf(a){ const t=a.t||SLOTM[a.slot].time; const m=String(t).replace('–','-').match(/(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})/); if(!m) return {s:8,e:18};
  let s=+m[1]+(+m[2])/60,e=+m[3]+(+m[4])/60; if(e<=s)e+=24; return {s,e}; }
const SALES_TREND={
 'สาทร':{hour:[1945,1470,768,0,0,0,0,0,306,1826,4495,4815,3538,2455,1850,1381,1931,2827,3968,3797,3466,2534,3054,2508],dow:[50022,53114,54620,47595,40812,46834,49543]},
 'พญาไท':{hour:[2318,2056,885,0,0,0,0,0,800,4032,4207,4476,2822,2153,1414,1758,2182,2540,3120,3101,2748,1779,1621,1354],dow:[52070,44253,46618,42566,42112,42098,47836]},
 'สุขุมวิท 77':{hour:[1982,1553,865,0,0,0,0,0,731,2782,5073,4668,3945,3034,2156,2278,3337,3380,3998,4710,3652,2689,2640,2259],dow:[65979,54557,54656,49525,51584,54600,59231]}};

const all=await rpc('sched_all');
const branches=all.branches, learns=all.learnings||[];
const brName={}; branches.forEach(b=>brName[b.id]=b.name);
const E={}; all.employees.forEach(e=>{
  const ps={}; (e.preferredSlots||[]).forEach(s=>ps[s]=1); const none=!(ps.morning||ps.mid||ps.late);
  E[e.id]={id:e.id,name:e.name,branchId:e.branchId,br:brName[e.branchId],positions:e.positions||[],aM:none||!!ps.morning,aMid:none||!!ps.mid,aL:none||!!ps.late,
    off:e.off||[],loanOk:!!e.loanOk,cg:e.commuteGroup||null,canOt:!!e.canOt,canSplit:!!e.canSplit}; });
function canLoanTo(e,bid){ if(brName[bid]==='พญาไท') return false; if(brName[e.branchId]==='พญาไท') return true;
  if(e.cg&&(brName[bid]==='สาทร'||brName[bid]==='สุขุมวิท 77')) return true; return false; }

for(const wk of ['2026-07-06','2026-07-13']){
  const g=await rpc('sched_grid_get',{p_week:wk}); const grid=g&&g.grid?g.grid:g;
  if(!grid){ console.log(wk,'ไม่มี grid'); continue; }
  console.log('\n================ สัปดาห์ '+wk+' ================');
  // index: per person per day → [{bid,slot,a}]
  const byPD={}, hours={}, days={};
  const issues=[], notes=[];
  branches.forEach(b=>{ const gb=grid[b.id]; if(!gb) return;
    for(let d=0;d<7;d++){ const gd=gb[d]; if(!gd) continue;
      SLOTS.forEach(slot=>{ (gd[slot]||[]).forEach(a=>{
        const e=E[a.id];
        if(!e){ issues.push(`[roster] id ไม่รู้จักใน grid: ${a.id} ${brName[b.id]} ${DOW[d]} ${slot}`); return; }
        (byPD[a.id]=byPD[a.id]||{}); (byPD[a.id][d]=byPD[a.id][d]||[]).push({bid:b.id,slot,a});
        const iv=intervalOf({...a,slot}); if(!a.off) hours[a.id]=(hours[a.id]||0)+(iv.e-iv.s)+ (a.ext&&!a.t?2:0);  // กะช่วยวันหยุด = OT พิเศษ นอกเพดานจัดกะ
        if(!a.off) (days[a.id]=days[a.id]||{})[d]=1;   // กะช่วยวันหยุด = ไม่นับเป็นวันทำงาน
      }); }); } });
  // --- per-person rule checks
  Object.keys(byPD).forEach(id=>{ const e=E[id];
    for(let d=0;d<7;d++){ const cur=byPD[id][d]||[];
      // H1 / split pairs
      if(cur.length>1){
        const set=new Set(cur.map(x=>x.slot));
        const ok=(e.canSplit&&set.has('lunch')&&set.has('dinner')&&cur.length===2)||(e.canSplit&&e.canOt&&set.has('lunch')&&set.has('night')&&cur.length===2);
        if(!ok) issues.push(`[H1] ${e.name} ${DOW[d]} มี ${cur.length} กะ: ${cur.map(x=>x.slot+(x.a.t?'('+x.a.t+')':'')).join('+')} ${cur.every(x=>x.a.locked)?'(locked หน้างานจริง)':''}`);
      }
      // branches ต่างกันวันเดียว?
      const bids=new Set(cur.map(x=>x.bid)); if(bids.size>1) issues.push(`[H1] ${e.name} ${DOW[d]} อยู่ 2 สาขาวันเดียวกัน`);
      // H4: กะที่จบดึก (end>24 จากเวลาจริง หรือ slot night) → วันถัดไปห้ามเริ่มก่อน 17:00
      const lateEnd=cur.some(x=>{ const iv=intervalOf({...x.a,slot:x.slot}); return iv.e>24; });
      if(lateEnd){ const nx=byPD[id][d+1]||[];
        nx.forEach(x=>{ const iv=intervalOf({...x.a,slot:x.slot}); if(iv.s<17) issues.push(`[H4] ${e.name} ${DOW[d]} เลิกดึก → ${DOW[d+1]} เข้า ${x.slot} ${x.a.t||''} (เริ่มก่อน 17:00)${x.a.locked?' (locked)':''}`); });
      }
      // H5 + slotAvail + splitOnly + loan
      cur.forEach(x=>{ const {slot,a,bid}=x;
        if(a.pos&&e.positions.indexOf(a.pos)<0) issues.push(`[H5] ${e.name} ${DOW[d]} ยืน ${a.pos} แต่ positions=[${e.positions}]${a.locked?' (locked)':''}`);
        const av= slot==='morning'?e.aM : slot==='night'?e.aL : slot==='mid'?(e.aM||e.aMid):true;
        if(!av) issues.push(`[avail] ${e.name} ${DOW[d]} ลง ${slot} แต่ prefs ไม่รองรับ${a.locked?' (locked)':''}`);
        if(SLOTM[slot].splitOnly&&!e.canSplit&&!a.t) issues.push(`[split] ${e.name} ${DOW[d]} ลงกะสั้น ${slot} แต่ไม่ใช่คน split${a.locked?' (locked)':''}`);
        const loan=e.branchId!==bid;
        if(loan){ if(!e.loanOk) issues.push(`[loan] ${e.name} ถูกยืมไป ${brName[bid]} ${DOW[d]} แต่ loan_ok=false`);
          if(!canLoanTo(e,bid)) issues.push(`[loanDir] ${e.name} (${e.br}) → ${brName[bid]} ${DOW[d]} ผิดทิศ`); }
      });
    }
    // H3: ชั่วโมง + วัน
    const wd=Object.keys(days[id]||{}).length, h=hours[id]||0;
    if(h>(e.canOt?72:60)+0.01) issues.push(`[H3] ${e.name} ${h.toFixed(1)} ชม. เกินเพดาน ${e.canOt?72:60}`);
    if(wd>(e.canOt?7:6)) issues.push(`[H3] ${e.name} ทำงาน ${wd} วัน เกิน ${e.canOt?7:6}`);
  });
  // 6 วันครบทุกคน
  const under=[],over=[];
  Object.values(E).forEach(e=>{ const wd=Object.keys(days[e.id]||{}).length;
    if(wd<6) under.push(`${e.name}(${e.br}) ${wd} วัน`); if(wd===7) over.push(`${e.name} 7 วัน(OT)`); });
  // coverage vs demand
  const holes=[], extra=[];
  branches.forEach(b=>{ const gb=grid[b.id]; if(!gb) return;
    for(let d=0;d<7;d++){ const dm=demandOf(b.plan,d); const gd=gb[d]||{};
      ['morning','night'].forEach(slot=>{ ['cook','kasst','cash'].forEach(pos=>{
        const have=(gd[slot]||[]).filter(a=>a.pos===pos&&!(a.t&&intervalOf({...a,slot}).e-intervalOf({...a,slot}).s<8)).length;
        const haveAll=(gd[slot]||[]).filter(a=>a.pos===pos).length;
        const need=dm[slot][pos]||0;
        if(haveAll<need) holes.push(`${brName[b.id]} ${DOW[d]} ${slot} ${pos} ขาด ${need-haveAll}`);
        else if(haveAll>need) extra.push(`${brName[b.id]} ${DOW[d]} ${slot} ${pos} +${haveAll-need}`);
      }); });
      // mid coverage
      const seen={}; let pairs=0;
      (gd.lunch||[]).forEach(a=>seen[a.id]=1);
      (gd.dinner||[]).forEach(a=>{if(seen[a.id])pairs++;});
      (gd.night||[]).forEach(a=>{if(seen[a.id])pairs++;});
      const ext=(gd.morning||[]).filter(a=>a.ext).length;
      const midC=(gd.mid||[]).filter(a=>a.pos==='cook').length+pairs+ext;
      const needMid=dm.mid.cook||0;
      if(midC<needMid) holes.push(`${brName[b.id]} ${DOW[d]} พีค(mid) ขาด ${needMid-midC}`);
    } });
  // off preference honored?
  const offMoved=[];
  Object.values(E).forEach(e=>{ if(!(e.off&&e.off.length)) return; if(!days[e.id]) return;
    const got=[...Array(7).keys()].filter(d=>!days[e.id][d]);
    const want=e.off.filter(d=>days[e.id][d]);
    if(want.length) offMoved.push(`${e.name} ขอหยุด ${want.map(d=>DOW[d]).join(',')} แต่ต้องทำ (ได้หยุด ${got.map(d=>DOW[d]).join(',')||'-'})`); });
  // commute pair
  const cgRep=[];
  { const mates=Object.values(E).filter(e=>e.cg);
    for(let d=0;d<7;d++){ const st=mates.map(e=>({e,cur:(byPD[e.id]&&byPD[e.id][d])||[]}));
      const on=st.filter(x=>x.cur.length);
      if(on.length===2){ const s1=new Set(on[0].cur.map(x=>x.slot)), s2=new Set(on[1].cur.map(x=>x.slot));
        const same=[...s1].some(s=>s2.has(s));
        cgRep.push(DOW[d]+':'+(same?'กะเดียวกัน':'คนละกะ')+(on[0].cur[0].bid===on[1].cur[0].bid?'':' คนละสาขา')); }
      else if(on.length===1) cgRep.push(DOW[d]+':คนเดียว('+on[0].e.name+')');
    } }
  // OT payroll
  const otRep=[];
  Object.keys(byPD).forEach(id=>{ const e=E[id]; let extraH=0, days7=[];
    for(let d=0;d<7;d++){ const cur=byPD[id][d]||[]; if(!cur.length) continue;
      let h=0; cur.forEach(x=>{const iv=intervalOf({...x.a,slot:x.slot}); h+=iv.e-iv.s;});
      if(h>10.01) { extraH+=h-10; } }
    const wd=Object.keys(days[id]||{}).length;
    if(extraH>0||wd>6) otRep.push(`${e.name}(${e.br}) ${extraH>0?('OT '+extraH.toFixed(0)+' ชม.'):''}${wd>6?' +วันเสริม 1 วัน':''}`); });
  // loans/trips
  const trips={};
  branches.forEach(b=>{ const gb=grid[b.id]; if(!gb) return;
    for(let d=0;d<7;d++){ const gd=gb[d]||{}; SLOTS.forEach(slot=>{ (gd[slot]||[]).forEach(a=>{
      const e=E[a.id]; if(!e||e.branchId===b.id) return;
      const free=e.cg&&brName[b.id]==='สาทร';
      const k=`${DOW[d]} ${e.br}→${brName[b.id]}${free?' (ฟรี-พักที่นั่น)':''}`;
      (trips[k]=trips[k]||[]).push(e.name+' '+slot); }); }); } });
  // staffing-per-hour vs sales share (per branch, avg weekday)
  console.log('--- ขาด (holes):', holes.length? '': 'ไม่มี'); holes.forEach(h=>console.log('   ✗',h));
  console.log('--- กฎแตก:', issues.length? '':'ไม่มี'); issues.forEach(i=>console.log('   ⚠',i));
  console.log('--- คนไม่ครบ 6 วัน:', under.join(' · ')||'ไม่มี (ครบทุกคน)');
  console.log('--- ทำ 7 วัน:', over.join(' · ')||'ไม่มี');
  console.log('--- วันหยุดที่ขอแต่ถูกย้าย:', offMoved.length); offMoved.forEach(o=>console.log('   ·',o));
  console.log('--- คู่รถ บาส+จ๋า:', cgRep.join(' | '));
  console.log('--- OT/วันเสริม (คิดเงินเพิ่ม):'); otRep.forEach(o=>console.log('   ·',o));
  console.log('--- เที่ยวยืม:', Object.keys(trips).length,'ทริป'); Object.keys(trips).sort().forEach(k=>console.log('   ·',k,'=',trips[k].join(', ')));
  console.log('--- เกินแผน (กำลังเสริมจาก fillTo6):', extra.length,'จุด');
  // extras on which days? should be heavy days
  const exByDay={}; extra.forEach(x=>{ const d=x.split(' ')[1]; exByDay[d]=(exByDay[d]||0)+1; });
  console.log('    กระจายวัน:', DOW.map(d=>d+'='+(exByDay[d]||0)).join(' '));
  // save state for improvement search
  global['W_'+wk]={grid,byPD,days,hours};
}
// export for improve step
global.E=E; global.branches=branches; global.brName=brName; global.demandOf=demandOf; global.canLoanTo=canLoanTo;
console.log('\nAUDIT DONE');
