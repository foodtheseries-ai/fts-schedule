# FTS Shift Scheduler

ระบบจัดตารางกะอัตโนมัติสำหรับร้าน Food The Series 3 สาขา (สาทร / สุขุมวิท 77 / พญาไท)
constraint-based scheduling · single-file web app + Supabase RPC · ไม่มีล็อกอิน (ใครมีลิงก์ดูได้ · แก้ได้เฉพาะเจ้าของที่มี PIN)

**Live:** https://foodtheseries-ai.github.io/fts-schedule/

---

## เริ่มตรงนี้ (สำหรับ dev รับช่วง)

1. อ่าน **[docs/HANDOFF.md](docs/HANDOFF.md)** — สถานะระบบ, engine logic ทั้งหมด, ปัญหาที่ค้าง 1 ข้อ (H4-box) พร้อมแนวทางแก้
2. อ่าน **[docs/DB.md](docs/DB.md)** — Supabase project, RPC, ตาราง, migration
3. รันเครื่องมือตรวจใน **[tools/](tools/)** เพื่อดูสถานะตารางปัจจุบัน

```bash
node tools/rest-check.mjs   # กฎวันหยุด (งานที่ต้องทำต่ออยู่ตรงนี้)
node tools/audit.mjs        # กฎกะหลักทั้งหมด + holes ต่อสาขา
node tools/crossweek.mjs    # กฎพักหลังกะดึกข้ามสัปดาห์
```

## โครงสร้าง

| path | คือ |
|---|---|
| `index.html` | **ทั้งระบบอยู่ไฟล์เดียวนี้** — UI + engine + Supabase client (vanilla JS, ไม่มี build) เป็นทั้ง source และตัว deploy |
| `docs/HANDOFF.md` | เอกสารส่งต่อ + engine logic + ปัญหาค้าง + แนวทางแก้ |
| `docs/DB.md` | reference ฝั่ง Supabase (RPC signatures, ตาราง, PIN) |
| `tools/*.mjs` | สคริปต์ตรวจกฎ (Node ≥18, ยิง RPC ตรง — mirror กฎใน engine) |

## แก้ + deploy

`index.html` เป็นทั้ง source และไฟล์ที่ deploy — แก้ตรงนี้ push แล้ว GitHub Pages rebuild เอง (~1 นาที)

```bash
# แก้ index.html
git add index.html && git commit -m "..." && git push
# ทุกเครื่องที่เปิดแอปอยู่เห็นตารางใหม่เองใน ~45 วิ (syncCheck)
```

> เหตุผลที่โฮสต์บน GitHub Pages ไม่ใช่ Supabase: Supabase Storage/Edge บังคับ `Content-Type: text/plain` บน GET → เบราว์เซอร์โชว์ source แทน render

## กฎย่อ (รายละเอียดใน HANDOFF)

- ทุกคนทำงาน 6 วัน/สัปดาห์ · หยุด ≤1 วัน/คน · หยุดพร้อมกัน ≤2 คน/วัน/สาขา
- กะเต็ม 10 ชม. (เช้า 08–18 / กลาง 10–20 / ดึก 17–03) · พีคสั้น 4 ชม. เฉพาะคน split
- กะดึกเลิกตี 3 → วันถัดไปห้ามเข้ากะเช้า/กลาง/เที่ยง (H4) · แต่กะเย็น/ดึกได้
- ยืมข้ามสาขา: พญาไทส่งออกอย่างเดียว · สาทร/สข77 ไม่ส่งออก · ยกเว้นคู่รถ บาส+จ๋า
