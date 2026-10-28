# QR Forever

เว็บไซต์สร้าง QR Code ภาษาไทยแบบ static สำหรับ GitHub Pages พร้อมระบบเข้าสู่ระบบด้วยอีเมล OTP และฐานข้อมูล Google Sheets บน Google Drive

## โครงสร้าง

- `index.html`, `styles.css`, `app.js` — หน้าเว็บสำหรับ GitHub Pages
- `config.js` — URL ของ API และโหมดตัวอย่าง
- `apps-script/Code-v2.gs` — API, ระบบสมัครสมาชิก/เข้าสู่ระบบ, อีเมล OTP และการบันทึกข้อมูล
- `apps-script/appsscript.json` — การตั้งค่า Google Apps Script

## 1. สร้างฐานข้อมูลบน Google Drive

1. สร้าง Google Sheet ใหม่ชื่อ `QR Forever Database`
2. เปิด **ส่วนขยาย → Apps Script**
3. นำโค้ดจาก `apps-script/Code-v2.gs` ไปวางแทนโค้ดทั้งหมดใน `Code.gs`
4. เปิดการตั้งค่าโปรเจกต์และเลือกแสดงไฟล์ manifest แล้วนำ `appsscript.json` ไปวาง
5. เลือกฟังก์ชัน `setup` แล้วกด **Run** หนึ่งครั้ง เพื่อสร้างชีต `Users` และ `QR_Codes`
6. อนุญาตสิทธิ์ Google Sheets และ Gmail ตามที่ Google แสดง

ระบบจะสร้างฐานข้อมูลสมาชิกพร้อมคอลัมน์ชื่อ ฝ่าย/กลุ่มงาน สำนักงาน และสถานะบัญชี หากต้องการจำกัดเฉพาะโดเมนอีเมลของสำนักงาน ให้เพิ่ม Script Property ชื่อ `ALLOWED_EMAIL_DOMAINS` เช่น `reo10.go.th,obec.go.th` หากเว้นว่างจะสมัครได้ทุกโดเมน

## 2. Deploy API

1. ใน Apps Script เลือก **Deploy → New deployment → Web app**
2. Execute as: **Me**
3. Who has access: **Anyone**
4. Deploy แล้วคัดลอก Web app URL ที่ลงท้ายด้วย `/exec`
5. แก้ `config.js` เป็น:

```js
window.QR_FOREVER_CONFIG = {
  API_URL: "วาง_URL_ที่ลงท้ายด้วย_exec_ที่นี่",
  DEMO_MODE: false
};
```

หมายเหตุ: Web app ต้องเปิดรับคำขอจากผู้ใช้ทั่วไปเพื่อส่ง OTP แต่ข้อมูลทุกแถวถูกแยกด้วยอีเมลและตรวจสอบ session token ฝั่ง Apps Script ก่อนบันทึกหรืออ่าน

## 3. ขึ้น GitHub Pages

1. สร้าง repository ใหม่บน GitHub
2. อัปโหลดไฟล์ในโฟลเดอร์ `qr-forever` โดยให้ `index.html` อยู่ที่ root ของ repository
3. ไปที่ **Settings → Pages**
4. Source: **Deploy from a branch**, Branch: `main`, Folder: `/ (root)`
5. รอ GitHub แสดง URL ของเว็บไซต์

## ทดสอบก่อนเชื่อม Google Drive

ค่าเริ่มต้นเปิด `DEMO_MODE: true` ใช้อีเมลใดก็ได้และรหัส OTP `123456` เพื่อทดลองหน้าสร้าง QR โดยยังไม่ส่งอีเมลหรือบันทึกข้อมูลจริง

## ข้อควรรู้

- QR ที่สร้างเป็น **Static QR** ข้อมูลฝังอยู่ในภาพโดยตรง จึงไม่หมดอายุและไม่มีโฆษณา
- หาก URL ปลายทางถูกปิดหรือเปลี่ยน QR เดิมจะยังอ่านค่าเดิม และจะไม่สามารถเปลี่ยนปลายทางภายหลังได้
- โลโก้ใช้เฉพาะตอนสร้างและดาวน์โหลดในเบราว์เซอร์ ไฟล์โลโก้ไม่ถูกอัปโหลดขึ้น Drive; ฐานข้อมูลบันทึกเฉพาะสถานะว่ามีโลโก้
- OTP มีอายุ 10 นาที และ session มีอายุ 30 วัน
