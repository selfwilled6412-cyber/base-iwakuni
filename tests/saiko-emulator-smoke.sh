#!/usr/bin/env bash
set -euo pipefail
adb install -r saiko-android/app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n jp.base.saikobeat/.MainActivity
sleep 16
adb shell uiautomator dump /sdcard/window.xml || true
adb pull /sdcard/window.xml /tmp/saiko-window.xml || true
adb shell screencap -p /sdcard/saiko-screen.png
adb pull /sdcard/saiko-screen.png saiko-android/emulator-screen.png
python3 - <<'PY'
import re
import xml.etree.ElementTree as ET
try:
    root=ET.parse('/tmp/saiko-window.xml')
    for n in root.iter('node'):
        label=n.attrib.get('text','')+' '+n.attrib.get('content-desc','')
        if 'すぐにプレイ' in label:
            box=[int(x) for x in re.findall(r'\d+',n.attrib.get('bounds',''))]
            if len(box)==4:
                open('/tmp/saiko-play-tap.txt','w').write(f'{(box[0]+box[2])//2} {(box[1]+box[3])//2}')
                break
except Exception as exc:
    print('UI selector unavailable:',exc)
PY
if [ -f /tmp/saiko-play-tap.txt ]; then
  adb shell input tap $(cat /tmp/saiko-play-tap.txt)
  sleep 6
  adb shell screencap -p /sdcard/saiko-playing.png
  adb pull /sdcard/saiko-playing.png saiko-android/emulator-playing.png
  adb shell uiautomator dump /sdcard/playing.xml || true
  adb pull /sdcard/playing.xml saiko-android/emulator-playing.xml || true
else
  echo "WARN: Play button inaccessible to uiautomator; screenshot must be reviewed."
fi
adb logcat -d -s AndroidRuntime:E SAIKO:E SAIKO-Web:E > saiko-android/emulator-errors.log
if grep -q 'FATAL EXCEPTION' saiko-android/emulator-errors.log; then
  cat saiko-android/emulator-errors.log
  exit 1
fi
echo "PASS: Emulator APK installed, activity started, screenshot captured, no Android fatal crash."
