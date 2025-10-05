# Nginx for static frontend + API reverse proxy
FROM nginx:alpine

# คัดลอกไฟล์ frontend (มี index.html และ asset)
COPY frontend /usr/share/nginx/html

# คัดลอก template และ entrypoint (ใช้แทนค่า ENV เป็นคอนฟิกจริง)
COPY nginx/nginx.conf.template /etc/nginx/templates/nginx.conf.template
COPY nginx/frontend-entrypoint.sh /docker-entrypoint.d/90-frontend-entrypoint.sh

RUN chmod +x /docker-entrypoint.d/90-frontend-entrypoint.sh \
  && apk add --no-cache ca-certificates wget

EXPOSE 80

# Healthcheck (Render จะเช็คที่พอร์ตภายใน 80)
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD wget -qO- http://127.0.0.1/health || exit 1
