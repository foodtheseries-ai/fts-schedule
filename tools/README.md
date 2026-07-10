# tools — เครื่องมือตรวจกฎ (verify)

สคริปต์ Node (≥18, ใช้ `fetch` ในตัว) ยิง Supabase RPC ตรงแล้ว **จำลองกฎ engine** เพื่อตรวจตารางจริงในระบบ — ไม่ต้องรันแอป

```bash
node tools/rest-check.mjs   # 3 กฎวันหยุด: ≤1/คน, ก่อนเริ่มงานไม่นับ, ≤2/วัน/สาขา
node tools/audit.mjs        # H1/H3/H4/H5, ทิศยืม, ครบ 6 วัน, holes, OT, ทริปยืม, คู่รถ
node tools/crossweek.mjs    # H4 ข้ามสัปดาห์ (ดึกอาทิตย์ → กะสายจันทร์)
node tools/fix-bee.mjs --dry   # โครงเริ่มต้นทาง B (§7) — ดูก่อนบันทึก (ตัด --dry เพื่อ save จริง)
```

## หมายเหตุ

- **anon key** ที่ hardcode ในสคริปต์ = ตัวเดียวกับใน `index.html` (public, read-only, ไม่ใช้ PIN สำหรับตัวตรวจ) — ถ้าจะ rotate เปลี่ยนทั้งที่นี่และใน index.html
- สคริปต์ตรวจ **hardcode สัปดาห์ทดสอบ** `2026-07-06` (สัปดาห์นี้) และ `2026-07-13` (สัปดาห์หน้า) — แก้เป็น dynamic (คำนวณจากวันจันทร์ปัจจุบัน) ได้ตามต้องการ
- `fix-bee.mjs` เขียนข้อมูลจริง (ต้อง PIN) — รัน `--dry` ก่อนเสมอ
- แนะนำ: ย้าย key/PIN ไปอ่านจาก env (`process.env.SB_ANON`) ก่อนใช้ใน CI

## ใช้เป็น regression gate

หลังแก้ engine ทุกครั้ง ให้ regen ทั้ง 2 สัปดาห์ในแอป (แท็บตั้งค่า → จัดอัตโนมัติ → ทั้งสัปดาห์) แล้วรันครบ 3 ตัว — เป็น Definition of Done ของงาน H4-box (ดู HANDOFF §7)
