# Préstamo de Recursos – Guía de instalación con Docker

Stack: **React** (Vite) · **Node.js + Express** · **PostgreSQL 16** · **Docker / Docker Compose**

## 1. Arquitectura

```
┌───────────── docker compose ─────────────┐
│  contenedor "app"          contenedor "db"│
│  ├─ React (Vite) :5173  ──►  PostgreSQL   │
│  └─ Express API  :3000       :5432        │
└───────────────────────────────────────────┘
```

- **Un solo contenedor para la app**: frontend y backend corren juntos (`npm run dev` con `concurrently`).
- **Un contenedor para la base de datos**: los datos viven en un volumen (`pgdata`) y no se pierden al reiniciar.
- En **producción** el frontend se compila y Express lo sirve: una sola imagen, un solo puerto.

## 2. Requisitos previos

### Windows (Docker Desktop)
1. Activar WSL2: en PowerShell como administrador, `wsl --install`, y reiniciar.
2. Instalar [Docker Desktop](https://www.docker.com/products/docker-desktop/) y marcar **Use WSL 2 based engine** (Settings → General).
3. Instalar [Git](https://git-scm.com/download/win).
4. **Recomendado:** clonar el proyecto *dentro* de WSL (`\\wsl$\Ubuntu\home\<usuario>\`), no en `C:\Users\...`. Es mucho más rápido y evita problemas de archivos.

### Linux
1. Instalar Docker Engine y el plugin Compose: <https://docs.docker.com/engine/install/>
2. Permitir usar Docker sin sudo: `sudo usermod -aG docker $USER` y volver a iniciar sesión.

Verificar en cualquier sistema:
```bash
docker --version
docker compose version
git --version
```

## 3. Arranque rápido (para quien clona el repo)

```bash
git clone <URL-DEL-REPOSITORIO>
cd proyecto-recursos

# Linux / macOS / WSL
cp .env.example .env
# PowerShell
# copy .env.example .env

docker compose up --build
```

La primera vez tarda unos minutos (descarga imágenes e instala dependencias). Cuando termine:

| Servicio | URL |
|---|---|
| Frontend React | <http://localhost:5173> |
| API (health check) | <http://localhost:3000/api/health> |
| PostgreSQL | `localhost:5432` (usuario/clave de tu `.env`) |

Si en la página ves **"Base de datos: connected"**, todo está funcionando.

## 4. Crear el repositorio (solo una persona, una vez)

Quien arma el repo debe generar los `package-lock.json` para que todo el equipo use **exactamente las mismas versiones**:

```bash
cp .env.example .env
docker compose up --build -d
docker compose exec app sh -c "npm install && npm install --prefix backend && npm install --prefix frontend"
docker compose down

git init
git add .
git commit -m "Estructura inicial con Docker"
git remote add origin <URL-DEL-REPOSITORIO>
git push -u origin main
```

> Se versionan los `package-lock.json`. **Nunca** se sube `.env` (ya está en `.gitignore`).

## 5. Uso diario

| Acción | Comando |
|---|---|
| Levantar todo | `docker compose up` |
| Levantar en segundo plano | `docker compose up -d` |
| Ver logs | `docker compose logs -f app` |
| Detener | `docker compose down` |
| Entrar al contenedor de la app | `docker compose exec app sh` |
| Entrar a PostgreSQL (psql) | `docker compose exec db psql -U app_user -d recursos_db` |
| **Borrar la BD y empezar de cero** | `docker compose down -v` |

El código se edita en tu máquina con tu editor favorito; los cambios se reflejan solos (recarga en caliente) en frontend y backend.

## 6. Instalar una dependencia nueva

Siempre **dentro del contenedor**, para no mezclar `node_modules` de Windows y Linux:

```bash
docker compose exec app npm install axios --prefix frontend
docker compose exec app npm install bcryptjs jsonwebtoken --prefix backend
```

Commit de `package.json` **y** `package-lock.json`. Cuando un compañero haga `git pull` y vea cambios en esos archivos, debe ejecutar:

```bash
docker compose up --build -V
```
(`-V` recrea los volúmenes de `node_modules` con las nuevas dependencias).

## 7. Estructura del proyecto

```
proyecto-recursos/
├── docker-compose.yml        # Desarrollo
├── docker-compose.prod.yml   # Producción
├── Dockerfile                # Multi-etapa: dev / build / prod
├── .env.example              # Plantilla de variables (copiar a .env)
├── .gitattributes            # Fuerza saltos de línea LF (importante en Windows)
├── package.json              # Raíz: lanza front + back juntos
├── backend/                  # Node + Express
│   └── src/ (index.js, db.js)
├── frontend/                 # React + Vite
│   └── src/ (main.jsx, App.jsx)
└── db/init/01-schema.sql     # Esquema inicial de PostgreSQL
```

El esquema inicial (`usuarios`, `recursos`, `solicitudes`, `sanciones`) es una **propuesta** basada en las historias de usuario del tablero. Ajústenlo entre todos. Solo se ejecuta cuando el volumen se crea por primera vez; para reaplicarlo usen `docker compose down -v`.

## 8. Producción

```bash
docker compose -f docker-compose.prod.yml up -d --build
```
La app queda en <http://localhost> (puerto `APP_PORT` del `.env`). En producción: contraseñas y `JWT_SECRET` fuertes, y PostgreSQL **no** se expone al exterior.

## 9. Problemas frecuentes

| Problema | Solución |
|---|---|
| `port is already allocated` (5432) | Ya tienes un Postgres local. Cambia `DB_PORT=5433` en `.env`. |
| Error `exec ... no such file` en Windows | Saltos de línea CRLF. Ejecuta `git config --global core.autocrlf false`, vuelve a clonar. |
| Docker Desktop no arranca | Verifica que WSL2 y la virtualización estén activados en la BIOS. |
| Los cambios no se reflejan | Clona dentro de WSL (no en `C:\`) y confirma que Docker Desktop usa WSL2. |
| `Cannot find module ...` tras un `git pull` | `docker compose up --build -V` |
| "password authentication failed" tras cambiar `.env` | El volumen guarda la clave anterior: `docker compose down -v`. |
| En Linux: `permission denied` al escribir archivos | Tu usuario debe tener UID 1000 (`id -u`); si no, avísame y ajusto el Dockerfile. |

## 10. Reglas del equipo

- Todos usan `docker compose`; no instalar Node ni PostgreSQL localmente para el proyecto.
- Nunca subir `.env`. Sí subir `package-lock.json`.
- Una dependencia nueva = se instala en el contenedor y se avisa al equipo.
