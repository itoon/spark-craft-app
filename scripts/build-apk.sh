#!/usr/bin/env bash
# Build an Android APK for one exported CodeCraft app — and optionally install
# it on a phone plugged in with a USB cable (like pressing Run in Android Studio).
#
#   bun run build:apk <slug>              build only
#   bun run build:apk <slug> --install    build, install on the USB phone, open it
#
# <slug> is the folder name shown after pressing "APK" in the editor
# (exports/apk/<slug>/codecraft-app.json). Needs Node 20+ and Android Studio
# (it bundles JDK 21 + the Android SDK) — see docs/build-apk.md.
# No Android Studio? Use .github/workflows/build-apk.yml instead.
#
# Progress lines start with "▶ <step>/<total>" so the editor can show them.
set -euo pipefail

SLUG=""
INSTALL=0
for arg in "$@"; do
  case "$arg" in
    --install) INSTALL=1 ;;
    -*) printf "unknown option %s\n" "$arg" >&2; exit 2 ;;
    *) SLUG="$arg" ;;
  esac
done

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_DIR="$ROOT/exports/apk/$SLUG"
PROJECT="$APP_DIR/android-project"
TOTAL=$((INSTALL == 1 ? 7 : 6))

say() { printf "\n▶ %s\n" "$*"; }
fail() { printf "\n✗ %s\n" "$*" >&2; exit 1; }

[ -n "$SLUG" ] || fail "ระบุชื่อแอป: bun run build:apk <slug>  (ดูได้จาก exports/apk/)"
[[ "$SLUG" =~ ^[a-z0-9-]+$ ]] || fail "ชื่อแอปต้องเป็น a-z 0-9 และ - เท่านั้น"
[ -f "$APP_DIR/codecraft-app.json" ] || fail "ไม่พบ $APP_DIR/codecraft-app.json — กดปุ่ม APK ใน editor ก่อน"
command -v node >/dev/null || fail "ไม่พบ node (ต้องการ Node 20+)"

# ── Java: use the system JDK, or the one bundled with Android Studio ──────
if ! java -version >/dev/null 2>&1; then
  for jbr in "/Applications/Android Studio.app/Contents/jbr/Contents/Home" \
             "$HOME/Applications/Android Studio.app/Contents/jbr/Contents/Home" \
             "/opt/android-studio/jbr" \
             "/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home" \
             "/usr/local/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home"; do
    if [ -x "$jbr/bin/java" ] && "$jbr/bin/java" -version >/dev/null 2>&1; then export JAVA_HOME="$jbr"; export PATH="$jbr/bin:$PATH"; break; fi
  done
fi
java -version >/dev/null 2>&1 || fail "ไม่พบ Java — ติดตั้ง Android Studio (มี JDK มาด้วย) หรือ brew install openjdk@21 (ดู docs/build-apk.md)"

# ── Android SDK ───────────────────────────────────────────────────────────
if [ -z "${ANDROID_HOME:-}" ] && [ -z "${ANDROID_SDK_ROOT:-}" ]; then
  # Android Studio's default SDK, then Homebrew's android-commandlinetools
  for candidate in "$HOME/Library/Android/sdk" "$HOME/Android/Sdk" \
                   "/opt/homebrew/share/android-commandlinetools" "/usr/local/share/android-commandlinetools"; do
    if [ -d "$candidate" ]; then export ANDROID_HOME="$candidate"; break; fi
  done
fi
SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
[ -n "$SDK" ] || fail "ไม่พบ Android SDK — ติดตั้ง Android Studio หรือ brew install --cask android-commandlinetools หรือใช้ GitHub Actions (docs/build-apk.md)"

ADB="$SDK/platform-tools/adb"
[ -x "$ADB" ] || ADB="$(command -v adb || true)"

# ── Check the phone BEFORE the long build when installing ─────────────────
check_phone() {
  [ -n "$ADB" ] || fail "ไม่พบ adb — ใน Android Studio ไปที่ SDK Manager → SDK Tools → ติ๊ก Android SDK Platform-Tools"
  "$ADB" start-server >/dev/null 2>&1 || true
  local list
  list="$("$ADB" devices | tail -n +2 | grep -v '^[[:space:]]*$' || true)"
  if [ -z "$list" ]; then
    fail "ไม่เจอมือถือ — เสียบสาย USB, เปิด 'การแก้ไขข้อบกพร่อง USB' ในตัวเลือกสำหรับนักพัฒนา แล้วลองใหม่"
  fi
  if echo "$list" | grep -q "unauthorized"; then
    fail "มือถือยังไม่อนุญาต — ดูที่หน้าจอมือถือแล้วกด 'อนุญาต' (ติ๊ก 'อนุญาตจากคอมนี้เสมอ')"
  fi
  if ! echo "$list" | grep -q "device$"; then
    fail "มือถือยังไม่พร้อม: $list"
  fi
  if [ -z "${ANDROID_SERIAL:-}" ]; then
    export ANDROID_SERIAL="$(echo "$list" | grep "device$" | head -1 | awk '{print $1}')"
  fi
  local model
  model="$("$ADB" shell getprop ro.product.model 2>/dev/null | tr -d '\r' || true)"
  echo "เจอมือถือ: ${model:-$ANDROID_SERIAL}"
}

if [ "$INSTALL" = 1 ]; then check_phone; fi

RUNNER="npx"
if command -v bunx >/dev/null; then RUNNER="bunx"; fi

say "1/$TOTAL สร้างเว็บแอปสำหรับใส่ใน APK"
cd "$ROOT"
# Separate build dir so this never disturbs a running `bun run dev`
# Clear old output first so a stale build can never end up in the APK
rm -rf "$ROOT/.output/public"
[ -L "$ROOT/dist" ] && rm -f "$ROOT/dist"
CODECRAFT_BUILD_DIR=.nuxt-apk NUXT_PUBLIC_CODECRAFT_EMBEDDED=1 $RUNNER nuxi generate

# Older Nuxt writes .output/public (+ a dist symlink); newer Nuxt writes dist/ directly
WEB_OUT=""
for candidate in "$ROOT/.output/public" "$ROOT/dist"; do
  if [ -f "$candidate/index.html" ]; then WEB_OUT="$candidate"; break; fi
done
[ -n "$WEB_OUT" ] || fail "ไม่พบไฟล์เว็บที่ build ได้ (.output/public หรือ dist) — ดู log ด้านบน"
echo "ใช้ไฟล์เว็บจาก ${WEB_OUT#$ROOT/}"

say "2/$TOTAL เตรียมโปรเจกต์ Android"
mkdir -p "$PROJECT"
if ! cmp -s "$ROOT/apk-template/package.json" "$PROJECT/package.json"; then
  cp "$ROOT/apk-template/package.json" "$PROJECT/package.json"
  rm -rf "$PROJECT/node_modules"
fi
node "$ROOT/scripts/write-capacitor-config.mjs" "$APP_DIR/meta.json" "$PROJECT/capacitor.config.json"
rm -rf "$PROJECT/www"
cp -RL "$WEB_OUT" "$PROJECT/www"
cp "$APP_DIR/codecraft-app.json" "$PROJECT/www/codecraft-app.json"

say "3/$TOTAL ติดตั้ง Capacitor"
cd "$PROJECT"
if [ ! -d node_modules ]; then
  npm install --no-audit --no-fund
else
  echo "(ใช้ของเดิมที่ติดตั้งไว้แล้ว)"
fi

say "4/$TOTAL สร้างโฟลเดอร์ android"
if [ ! -d "$PROJECT/android" ]; then
  npx cap add android
else
  echo "(มีอยู่แล้ว)"
fi
# Permissions for the elements / services this app uses (camera, GPS, Bluetooth, vibrate)
node "$ROOT/scripts/patch-android-manifest.mjs" "$PROJECT/android/app/src/main/AndroidManifest.xml" "$APP_DIR/codecraft-app.json"
# Name + icon from "แอปของฉัน" — every build, so a renamed app updates on the phone
node "$ROOT/scripts/apply-app-identity.mjs" "$APP_DIR/meta.json" "$PROJECT/android"
if [ -f "$APP_DIR/icon/icon-only.png" ]; then
  rm -rf "$PROJECT/assets"
  mkdir -p "$PROJECT/assets"
  cp "$APP_DIR"/icon/*.png "$PROJECT/assets/"
  npx capacitor-assets generate --android
else
  echo "(ใช้ไอคอนเดิม)"
fi

say "5/$TOTAL sync"
npx cap sync android

say "6/$TOTAL build APK (Gradle — ครั้งแรกนาน 5–10 นาที)"
cd "$PROJECT/android"
chmod +x ./gradlew
./gradlew assembleDebug --console=plain

APK="$PROJECT/android/app/build/outputs/apk/debug/app-debug.apk"
[ -f "$APK" ] || fail "build ไม่สำเร็จ — ดู log ด้านบน"
cp "$APK" "$APP_DIR/$SLUG.apk"
echo "APK: $APP_DIR/$SLUG.apk"

if [ "$INSTALL" = 1 ]; then
  say "7/$TOTAL ติดตั้งลงมือถือ"
  APP_ID="$(node -e "console.log(require('$APP_DIR/meta.json').appId)")"
  # --user current: without it adb installs into every profile on the phone
  # (Samsung Dual Messenger, work profile…) and the app shows up twice
  "$ADB" install -r --user current "$APP_DIR/$SLUG.apk" || {
    echo "ติดตั้งทับไม่ได้ (อาจเคยลงจาก APK ที่เซ็นต่างกัน) — ลบของเก่าแล้วลงใหม่"
    "$ADB" uninstall "$APP_ID" >/dev/null 2>&1 || true
    "$ADB" install --user current "$APP_DIR/$SLUG.apk"
  }
  # Remove copies an older build put into other profiles (the second icon)
  CURRENT_USER="$("$ADB" shell am get-current-user 2>/dev/null | tr -d '\r' || true)"
  for uid in $("$ADB" shell pm list users 2>/dev/null | sed -n 's/.*UserInfo{\([0-9]*\):.*/\1/p'); do
    [ "$uid" = "$CURRENT_USER" ] && continue
    if "$ADB" shell pm list packages --user "$uid" 2>/dev/null | tr -d '\r' | grep -qx "package:$APP_ID"; then
      "$ADB" shell pm uninstall --user "$uid" "$APP_ID" >/dev/null 2>&1 && echo "ลบแอปซ้ำในโปรไฟล์ $uid แล้ว"
    fi
  done
  "$ADB" shell monkey -p "$APP_ID" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1 || true
  echo "✓ ติดตั้งและเปิดแอปบนมือถือแล้ว"
fi

printf "\n✓ เสร็จแล้ว\n"
