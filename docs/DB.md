# DB Reference — Supabase

**Project:** `fts-os-prod` · ref `mbposllztajrwjjnfyvg` (นี่คือ prod ของ FTS OS ทั้งระบบ — มีตารางอื่นเยอะ ระวังตอนแก้)
**Schema:** ตาราง/ฟังก์ชันของ scheduler อยู่ใน schema `public` (บางตารางเดิมอยู่ `app`)
**Auth:** ไม่มีล็อกอิน — client ใช้ **anon key** ยิง RPC ที่เป็น `security definer` ทั้งหมด

> ⚠️ ฟังก์ชัน `sched_all` / `sched_emp_save` ถูก hot-patch เพิ่ม `hired_at` ผ่าน `execute_sql` (ไม่ได้ผ่าน migration) — **ประวัติ migration ไม่ครบ 100%** ให้ dump `pg_get_functiondef()` ของฟังก์ชันจริงเป็น source of truth อย่าอ้างจาก migration อย่างเดียว

---

## RPC ที่ใช้จริง (จาก index.html)

### อ่าน (anon, ไม่ต้อง PIN)

| RPC | คืน |
|---|---|
| `sched_all()` | `{ seed, branches[], employees[], learnings[] }` · employees มี `id, name, branchId, positions[], preferredSlots[], off[], loanOk, commuteGroup, canOt, canSplit, hiredAt` |
| `sched_grid_get(p_week date)` | `{ grid }` หรือ grid ตรงๆ ของสัปดาห์นั้น |

### เขียน (ต้องมี `p_pin` — bcrypt เทียบ `sched_settings.owner_pin`, PIN=7788)

| RPC | ทำ |
|---|---|
| `sched_grid_save(p_week, p_grid, p_pin)` | เขียน grid ทั้งสัปดาห์ |
| `sched_emp_save(p_id, p_branch, p_name, p_positions[], p_slots[], p_off[], p_loan, p_ot, p_split, p_pin, p_hired)` | เพิ่ม/แก้พนักงาน (id null = สร้างใหม่) + วันเริ่มงาน |
| `sched_emp_delete(p_id, p_pin)` | ลบพนักงาน (soft: status→inactive, deleted_at) |
| `sched_set_plan(p_branch, p_key, p_m, p_mid, p_n, p_pin)` | แผนกำลังคนหลักต่อสาขา |
| `sched_set_day_plan(p_branch, p_day, p_key, p_pin)` | แผนรายวัน (null = ล้าง ใช้แผนหลัก) |
| `sched_seed_bump(p_pin)` | สุ่มจัดใหม่ (เปลี่ยน seed) |
| `sched_learn(p_emp, p_kind, p_slot, p_day, p_delta, p_reason, p_pin)` | บันทึกการเรียนรู้จากการแก้มือ |
| `sched_set_pin(p_old, p_new)` | เปลี่ยน PIN |
| `sched_check_pin(p_pin)` | เช็ค PIN ก่อนปลดล็อก UI |

> **เพิ่ม RPC แก้ข้อมูลตัวใหม่:** ต้องมี `if not sched_check_pin(p_pin) then raise exception ...` + เพิ่มชื่อใน `MUT_RPC` map ใน index.html (client แนบ p_pin อัตโนมัติ)

### เลิกใช้แล้ว (ยังอยู่ใน DB)
`sched_bootstrap, sched_week, sched_save, sched_set_prefs` — จากโมเดล draft/publish เดิม ไม่ได้ใช้แล้ว

---

## ตารางหลัก

| ตาราง | ใช้ทำ |
|---|---|
| `sched_grid(week_start pk, grid jsonb)` | ตารางกะทั้งสัปดาห์ทุกสาขา (โครงสร้างใน HANDOFF §2) |
| `branch_staffing_plan(branch_id, plan_key, cook_m, cook_mid, cook_n, day_plans jsonb)` | แผนกำลังคนต่อสาขา + แผนรายวัน `{"0":"p313",...}` |
| `employee_prefs(employee_id, positions[], preferred_slots[], loan_ok, commute_group, can_ot, can_split, ...)` | ความสามารถ/ความชอบของพนักงาน |
| `employee_availability(employee_id, preferred_days_off[], available_morning/mid/late)` | วันหยุดที่ขอ + กะที่สะดวก |
| `employees(id, full_name_th, home_branch_id, position, hired_at, status, deleted_at)` | มาสเตอร์พนักงาน (schema public) |
| `branches(id, code, name_th)` | สาขา — code: `SAT` / `SKV77` / `PYT` |
| `sched_settings(id='global', seed, owner_pin)` | seed ร่วม + PIN (bcrypt) |
| `sched_learnings(employee_id, kind, slot, day, delta)` | delta คะแนนจากการแก้มือ (avoid/prefer slot/day) |

**แผน (plan_key) → demand:** `p22`(3-3) `p313`(3-1-3) `p314`(3-1-4) `p34`(3-4 ดึกแน่น) `p43`(4-3 เช้าแน่น) `p44`(4-4)
mapping อยู่ใน `PLAN_BY_KEY` ทั้งใน index.html และ tools/*.mjs

---

## กะใน DB ใช้ `late` (ไม่ใช่ `night`)

`preferred_slots` เก็บ `morning / mid / late` · engine ใช้ `night` · แปลงที่ขอบด้วย `SLOT_DB2ENG`

---

## ข้อมูลจริง (ณ 2026-07-09)

- 3 สาขา: **สาทร** (6 คน) · **สุขุมวิท 77** (9 คน) · **พญาไท** (10 คน) = 25 คน
- คนที่ลาออกแล้ว (inactive) แต่มีในประวัติกะ: **หมวย** `6e29f531-...` (cash) · **เล็ก** `80661a03-...` (cook) → เก็บชื่อใน `assignment.name` (ghost)
- new hire: **ปูนา** `hired_at=2026-07-08` (คนอื่น backfill เป็น 2026-07-06 = ต้นข้อมูล)
- คู่รถ: **บาส + จ๋า** `commute_group='cg_bas_ja'` (บ้านสาทร ทำงานสข77)
