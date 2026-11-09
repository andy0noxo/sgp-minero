#!/bin/sh
set -eu

python manage.py migrate --noinput

INIT_MARKER="/var/lib/sgp_container_initialized"
RESET_ON_START="${RESET_DB_ON_START:-False}"
RESET_ON_CREATE="${RESET_DB_ON_CONTAINER_CREATE:-True}"

if [ "$RESET_ON_START" = "True" ] || [ "$RESET_ON_START" = "true" ] || [ "$RESET_ON_START" = "1" ]; then
    echo "RESET_DB_ON_START activo: reiniciando base de datos de desarrollo en limpio..."
    python manage.py seed_demo_data --reset
    touch "$INIT_MARKER"
elif [ ! -f "$INIT_MARKER" ] && [ "$RESET_ON_CREATE" != "False" ] && [ "$RESET_ON_CREATE" != "false" ] && [ "$RESET_ON_CREATE" != "0" ]; then
    echo "Contenedor nuevo detectado: limpiando datos residuales del volumen y aplicando seed limpio..."
    python manage.py seed_demo_data --reset
    touch "$INIT_MARKER"
else
    python manage.py seed_demo_data
fi

exec python manage.py runserver 0.0.0.0:8000
