#!/usr/bin/env sh
set -eu

TEMPLATE_IN="/etc/nginx/templates/nginx.conf.template"
CONF_OUT="/etc/nginx/conf.d/default.conf"

# ให้ตัวแปรว่างได้โดยไม่ error
: "${PUBLIC_MEDIA_BASE_URL:=}"

echo "[entrypoint] PUBLIC_MEDIA_BASE_URL=${PUBLIC_MEDIA_BASE_URL}"

# แทนค่า ENV -> เขียนคอนฟิกจริง
envsubst '${PUBLIC_MEDIA_BASE_URL}' < "$TEMPLATE_IN" > "$CONF_OUT"

echo "[entrypoint] Wrote Nginx config to ${CONF_OUT}"
