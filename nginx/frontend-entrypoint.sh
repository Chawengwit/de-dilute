#!/usr/bin/env sh
set -eu

TEMPLATE_IN="/etc/nginx/templates/nginx.conf.template"
CONF_OUT="/etc/nginx/conf.d/default.conf"

# ให้ตัวแปรว่างได้โดยไม่ error
: "${PUBLIC_MEDIA_BASE_URL:=}"
: "${API_BASE:=}"

echo "[entrypoint] PUBLIC_MEDIA_BASE_URL=${PUBLIC_MEDIA_BASE_URL}"
echo "[entrypoint] API_BASE=${API_BASE}"

# แทนค่า ENV -> เขียนคอนฟิกจริง
# ระบุสองตัวแปรให้ชัดเพื่อไม่ให้ envsubst เคลียร์ค่าอื่นโดยไม่ตั้งใจ
envsubst '${PUBLIC_MEDIA_BASE_URL} ${API_BASE}' < "$TEMPLATE_IN" > "$CONF_OUT"

echo "[entrypoint] Wrote Nginx config to ${CONF_OUT}"
