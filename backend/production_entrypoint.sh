#!/bin/sh
set -eu

echo "Recolectando archivos estáticos con WhiteNoise..."
python manage.py collectstatic --noinput

echo "Aplicando migraciones en base de datos PostgreSQL..."
python manage.py migrate --noinput

echo "Iniciando Gunicorn WSGI en puerto ${PORT:-8000}..."
exec gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8000}
