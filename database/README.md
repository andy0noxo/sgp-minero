# PostgreSQL y persistencia

PostgreSQL es un servicio independiente del backend y del frontend. En
desarrollo se ejecuta mediante el servicio `db` de
[`docker-compose.yml`](../docker-compose.yml); en producción puede reemplazarse
por PostgreSQL administrado, como Neon, sin cambiar el dominio del backend.

## Fuente única del esquema

El esquema oficial pertenece a Django y se versiona en
[`backend/core/migrations/`](../backend/core/migrations/). No se crean tablas
duplicadas mediante SQL manual: esto evita que el esquema de PostgreSQL se
desincronice del ORM, las pruebas y el despliegue.

La carpeta `database` se conserva como frontera de infraestructura para:

- documentar la operación de PostgreSQL;
- agregar en el futuro scripts idempotentes de seeds o mantenimiento;
- centralizar instrucciones de respaldo, restauración o migración operativa.

Los scripts futuros no deben contener credenciales, datos reales ni
definiciones de tablas que ya pertenezcan a las migraciones.

## Creación local con Docker

Desde la raíz del repositorio:

```text
docker compose up --build
```

En el primer arranque, PostgreSQL crea automáticamente la base definida por
`DB_NAME`. El backend espera el healthcheck del servicio `db` y ejecuta
`python manage.py migrate --noinput` antes de iniciar Django.

La base queda disponible en `localhost:5432` con las credenciales de `.env`.
Si `.env` todavía no existe, Compose utiliza valores de desarrollo seguros para
la prueba local. Para un entorno compartido se debe copiar `.env.example` a
`.env` y reemplazar todas las credenciales y llaves.

Comandos de verificación:

```text
docker compose exec backend python manage.py showmigrations
docker compose exec backend python manage.py check
docker compose exec backend python manage.py test core
docker compose exec db pg_isready -U usuario_local -d sgp_minero_db
```

## Persistencia y datos

El volumen Docker `pgdata` mantiene los datos entre reinicios. No debe
eliminarse en un entorno con datos que se quieran conservar. Para reiniciar
solamente un entorno local descartable se puede eliminar explícitamente ese
volumen y volver a levantar Compose.

Las credenciales, `AES_SECRET_KEY`, archivos `.env` y datos reales no deben
versionarse. La PII de los viajes se cifra antes de persistirse en el campo
`JSONB` de `RegistroViaje`.
