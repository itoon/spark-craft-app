# Build APK — ทำแอปให้ติดตั้งบนมือถือ Android ได้

เทียบกับ App Inventor คือเมนู **Build → Android App (.apk)**

## วิธีที่ง่ายที่สุด: เสียบสายแล้วกดปุ่มเดียว (เหมือน Run จาก Android Studio)
1. ติดตั้ง **Android Studio** ครั้งเดียว แล้วเปิดครั้งแรกให้ติดตั้ง SDK (มี JDK มาด้วยแล้ว) — หรือลงผ่าน Homebrew แทนก็ได้ (ดู “ทาง A” ด้านล่าง)
2. มือถือ: ตั้งค่า → เกี่ยวกับโทรศัพท์ → แตะ “หมายเลขบิลด์” 7 ครั้ง → ตัวเลือกสำหรับนักพัฒนา → เปิด **การแก้ไขข้อบกพร่อง USB**
3. เสียบสาย USB แล้วกด “อนุญาต” บนมือถือ
4. ใน editor กด **APK** → เห็น “เจอมือถือ: …” → กด **Build + ติดตั้งลงมือถือ**
5. รอให้แถบความคืบหน้าครบ แอปจะติดตั้งและเปิดบนมือถือเอง (ครั้งแรก 5–10 นาที ครั้งต่อไป ~1 นาที)

แก้แอปแล้วอยากลองใหม่ → กดปุ่มเดิมอีกครั้ง ระบบติดตั้งทับให้ ข้อมูลใน storage ของแอปยังอยู่

ผ่าน Terminal ก็ได้: `bun run build:apk <slug> --install`

### ไม่เสียบสาย: Wi‑Fi (Android 11+)
1. มือถือกับคอมต่อ Wi‑Fi วงเดียวกัน
2. มือถือ: ตัวเลือกสำหรับนักพัฒนา → **การแก้ไขข้อบกพร่องแบบไร้สาย** → เปิด
3. ในหน้าต่าง APK เปิด “ไม่อยากเสียบสาย? เชื่อมผ่าน Wi‑Fi”
   - **จับคู่** (ครั้งแรกครั้งเดียว): มือถือแตะ “จับคู่อุปกรณ์ด้วยรหัสการจับคู่” → กรอก IP:พอร์ต + รหัส 6 หลัก
   - **เชื่อมต่อ**: กรอก IP:พอร์ต จากหน้าหลักของ “การแก้ไขข้อบกพร่องแบบไร้สาย” (พอร์ตต่างจากตอนจับคู่)
4. เจอมือถือแล้วกด **Build + ติดตั้งลงมือถือ** ได้เลย — ครั้งต่อไปหน้าต่าง APK จะลองเชื่อมต่อเครื่องเดิมให้เอง (ถ้ามือถือปิดแล้วเปิด Wireless debugging ใหม่ พอร์ตจะเปลี่ยน ต้องกรอกใหม่)

### ไม่ใช้ adb: สแกน QR ดาวน์โหลด
หลัง build เสร็จ หน้าต่าง APK แสดง QR ของไฟล์ `.apk` (`/api/export/apk/download/<slug>.apk`) มือถือที่ต่อ Wi‑Fi เดียวกันสแกน → ดาวน์โหลด → แตะเพื่อติดตั้ง ไม่ต้องส่งไฟล์ผ่านแชท

> ปุ่มที่สั่งงานบนคอม (build, adb) ใช้ได้จากคอมเครื่องนี้เท่านั้น เครื่องอื่นใน Wi‑Fi เรียกไม่ได้ ส่วนลิงก์ดาวน์โหลด APK เปิดจากมือถือได้

## ขั้นที่ 1 — กดปุ่ม APK ใน editor
กดปุ่ม **APK** ที่แถบด้านบน ระบบจะบันทึกแอปไว้ที่ `exports/apk/<slug>/` และแสดงคำสั่งให้คัดลอก

## ขั้นที่ 2 — build (เลือกทางใดทางหนึ่ง)

### ทาง A: build บนคอมเครื่องนี้
ติดตั้งครั้งแรกครั้งเดียว:
1. **Android Studio** (มี JDK 21 มาด้วย ไม่ต้องลงแยก) — https://developer.android.com/studio เปิดครั้งแรกให้มันติดตั้ง Android SDK ให้ (อยู่ที่ `~/Library/Android/sdk`)

**หรือไม่ลง Android Studio** — ลงเฉพาะเครื่องมือที่จำเป็นผ่าน Homebrew (เล็กกว่ามาก):
```bash
brew install openjdk@21
brew install --cask android-commandlinetools
# openjdk@21 ไม่ได้ลิงก์เข้าระบบเอง ต้องบอก sdkmanager ว่า Java อยู่ไหน
export JAVA_HOME="$(brew --prefix openjdk@21)/libexec/openjdk.jdk/Contents/Home"
yes | sdkmanager --licenses                  # ยอมรับ license ทุกข้อ
sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.0"   # platform-tools มี adb มาด้วย
```
หรือวางบรรทัดเดียวจบ (ปุ่มคัดลอกอยู่ในหน้าต่าง APK):
```bash
brew install openjdk@21 && brew install --cask android-commandlinetools && export JAVA_HOME="$(brew --prefix openjdk@21)/libexec/openjdk.jdk/Contents/Home" && yes | sdkmanager --licenses && sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.0"
```
> ⚠️ ถ้าวางหลายคำสั่งรวมเป็นบรรทัดเดียวโดยไม่มี `&&` คั่น จะได้ `Error: invalid option: --licenses` เพราะ brew เอาทุกคำต่อท้ายไปเป็นตัวเลือกของตัวเอง

สคริปต์หา Java (`openjdk@21` ของ Homebrew) และ SDK (`/opt/homebrew/share/android-commandlinetools`) เจอเอง ไม่ต้องตั้ง `ANDROID_HOME`
หลังติดตั้งให้ปิดแล้วเปิด `bun run dev` ใหม่ ปุ่ม APK ใน editor จึงจะเห็น adb

จากนั้นทุกครั้ง:
```bash
cd codecraftapp
bun run build:apk <slug>
```
เสร็จแล้วได้ไฟล์ `exports/apk/<slug>/<slug>.apk`

### ทาง B: build บน GitHub (ไม่ต้องติดตั้งอะไร)
1. push โฟลเดอร์ `exports/apk/<slug>/` ขึ้น GitHub (ไฟล์ `codecraft-app.json` และ `meta.json`)
2. ไปที่แท็บ **Actions → Build CodeCraft APK → Run workflow** แล้วพิมพ์ `<slug>`
3. รอ ~5–8 นาที แล้วดาวน์โหลดไฟล์ APK จากหัวข้อ **Artifacts** ของรอบนั้น

## ขั้นที่ 3 — ติดตั้งบนมือถือ
ส่งไฟล์ `.apk` เข้ามือถือ (LINE / Google Drive / สาย USB) → แตะเพื่อติดตั้ง → ครั้งแรกให้อนุญาต “ติดตั้งแอปที่ไม่รู้จัก”

## ในแอป APK ทำอะไรได้บ้าง
- GPS, การเขย่า/เอียง, เสียงพูด, การสั่น, storage — ใช้ได้ทันที (แอปจะขออนุญาตตำแหน่งตอนเรียก `location.get()` ครั้งแรก)
- กล้อง (element Camera) — แอปขออนุญาตกล้องตอนกด `open()` ครั้งแรก
- Bluetooth กับ ESP32 / micro:bit — ใช้ปลั๊กอิน `@capacitor-community/bluetooth-le` (แอปขออนุญาต “อุปกรณ์ใกล้เคียง” ครั้งแรก)
- แผนที่ — ต้องต่ออินเทอร์เน็ต

### สิทธิ์ (permission) ที่ APK ขอ
ตอน build จะดูว่าแอปใช้อะไร แล้วใส่สิทธิ์ลง `AndroidManifest.xml` เฉพาะที่ใช้ (`scripts/patch-android-manifest.mjs`):

| แอปใช้ | สิทธิ์ที่ขอ |
|---|---|
| element **Camera** | กล้อง (`CAMERA`) |
| `location.get()` / `location.watch()` | ตำแหน่ง (`ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`) |
| `ble.connect()` ฯลฯ | อุปกรณ์ใกล้เคียง (`BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT`) |
| `phone.vibrate()` | สั่น (`VIBRATE`) |

สิทธิ์ที่ไม่ได้ใส่ใน manifest จะถูกปฏิเสธทันทีโดยไม่มีหน้าต่างถาม เช่น กล้องขึ้น “permission denied” — ถ้าเพิ่ม element หรือโค้ดพวกนี้ ต้องกดปุ่ม APK แล้ว build ใหม่
- APK ที่ได้เป็นแบบ **debug** ใช้ติดตั้งในห้องเรียนได้ ถ้าจะลง Play Store ต้องเซ็นด้วย keystore ของโรงเรียนเพิ่ม

## แก้ปัญหา
| อาการ | วิธีแก้ |
|---|---|
| `ไม่พบ Java` | ติดตั้ง Android Studio (มี JDK มาด้วย) หรือ `brew install openjdk@21` |
| `Error: invalid option: --licenses` | วางหลายคำสั่งเป็นบรรทัดเดียว ใช้คำสั่งบรรทัดเดียวที่มี `&&` ด้านบน |
| `sdkmanager`: JAVA_HOME is not set | `export JAVA_HOME="$(brew --prefix openjdk@21)/libexec/openjdk.jdk/Contents/Home"` แล้วรันใหม่ |
| ไม่เจอมือถือ | เปลี่ยนสาย USB (บางสายชาร์จได้อย่างเดียว), เปิด “การแก้ไขข้อบกพร่อง USB” ใหม่ |
| ไม่พบ adb | Android Studio → SDK Manager → SDK Tools → ติ๊ก Android SDK Platform-Tools |
| `ไม่พบ Android SDK` | เปิด Android Studio ครั้งแรกให้ติดตั้ง SDK หรือ `export ANDROID_HOME=~/Library/Android/sdk` |
| Gradle ดาวน์โหลดนาน | ครั้งแรกใช้เวลา 5–10 นาที ครั้งต่อไปเร็วขึ้นมาก |
| แก้แอปแล้ว | กดปุ่ม APK ใน editor ใหม่ แล้วรัน `bun run build:apk <slug>` อีกครั้ง |
| กล้อง / GPS ขึ้น permission denied | build ใหม่ (สิทธิ์จะถูกใส่ตามที่แอปใช้) ถ้าเคยกด “ไม่อนุญาต” ไว้ ให้เปิดที่ ตั้งค่า → แอป → ชื่อแอป → การอนุญาต |
| แอปขึ้น 2 icon (Samsung) | เกิดจาก Dual Messenger — build ใหม่ด้วย `--install` จะลงเฉพาะโปรไฟล์หลักและลบตัวซ้ำให้ |
