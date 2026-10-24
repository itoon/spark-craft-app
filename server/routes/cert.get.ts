import { setHeader } from "h3";

/**
 * Plain page (no app JS) that walks a phone through trusting the classroom CA
 * once. After that, every https://<this computer>:3443 page is "secure" on it.
 */
export default defineEventHandler((event) => {
  setHeader(event, "Content-Type", "text/html; charset=utf-8");
  return `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ติดตั้งใบรับรองห้องเรียน</title>
<style>
  :root { color-scheme: light dark; --bg: #f8fafc; --card: #fff; --text: #0f172a; --muted: #475569; --accent: #4f46e5; }
  @media (prefers-color-scheme: dark) { :root { --bg: #0f172a; --card: #1e293b; --text: #f1f5f9; --muted: #94a3b8; --accent: #818cf8; } }
  body { margin: 0; font: 16px/1.6 -apple-system, system-ui, sans-serif; background: var(--bg); color: var(--text); }
  main { max-width: 520px; margin: 0 auto; padding: 24px 16px 48px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  p.lead { color: var(--muted); margin: 0 0 20px; }
  .card { background: var(--card); border-radius: 16px; padding: 16px 18px; margin-bottom: 12px; }
  .card h2 { font-size: 16px; margin: 0 0 6px; }
  ol { margin: 0; padding-left: 20px; }
  li { margin: 4px 0; }
  a.button { display: block; text-align: center; background: var(--accent); color: #fff; text-decoration: none;
    font-weight: 600; padding: 14px; border-radius: 12px; margin: 8px 0 20px; }
  b { font-weight: 600; }
  .muted { color: var(--muted); font-size: 14px; }
</style>
</head>
<body>
<main>
  <h1>ติดตั้งใบรับรองห้องเรียน</h1>
  <p class="lead">ทำครั้งเดียวต่อเครื่อง แล้วแอปที่ครูแชร์จะติดตั้งลงหน้าจอโฮม ใช้กล้อง/GPS และเปิดแบบออฟไลน์ได้</p>

  <a class="button" href="/codecraft-ca.crt">1. ดาวน์โหลดใบรับรอง</a>

  <div class="card">
    <h2>iPhone / iPad</h2>
    <ol>
      <li>แตะปุ่มด้านบน แล้วกด <b>อนุญาต</b></li>
      <li>ไปที่ <b>การตั้งค่า</b> → แตะ <b>ดาวน์โหลดโปรไฟล์แล้ว</b> (ด้านบน) → <b>ติดตั้ง</b></li>
      <li><b>การตั้งค่า → ทั่วไป → เกี่ยวกับ → การตั้งค่าความเชื่อถือของใบรับรอง</b> → เปิดสวิตช์ <b>CodeCraft Classroom CA</b></li>
      <li>ปิด Safari แล้วเปิดลิงก์แอปที่ครูแชร์ใหม่</li>
    </ol>
  </div>

  <div class="card">
    <h2>Android</h2>
    <ol>
      <li>แตะปุ่มด้านบนเพื่อดาวน์โหลด</li>
      <li><b>การตั้งค่า → ความปลอดภัย → ใบรับรอง/การเข้ารหัส → ติดตั้งจากที่เก็บข้อมูลของอุปกรณ์ → ใบรับรอง CA</b> แล้วเลือกไฟล์ codecraft-classroom.crt</li>
    </ol>
  </div>

  <p class="muted">ใบรับรองนี้ใช้ได้กับคอมของครูเครื่องนี้เท่านั้น ลบออกได้ที่หน้าเดียวกับที่ติดตั้ง</p>
</main>
</body>
</html>`;
});
