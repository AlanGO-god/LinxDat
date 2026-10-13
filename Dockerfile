# ---------- Base común ----------
FROM node:22-bookworm-slim AS base
RUN mkdir -p /app && chown node:node /app
WORKDIR /app
USER node

# ---------- DESARROLLO: backend + frontend en un solo contenedor ----------
FROM base AS dev
COPY --chown=node:node package*.json ./
COPY --chown=node:node backend/package*.json backend/
COPY --chown=node:node frontend/package*.json frontend/
RUN npm install \
 && npm install --prefix backend \
 && npm install --prefix frontend
COPY --chown=node:node . .
EXPOSE 3000 5173
CMD ["npm", "run", "dev"]

# ---------- PRODUCCIÓN (paso 1): compilar React ----------
FROM base AS build-frontend
COPY --chown=node:node frontend/package*.json frontend/
RUN npm install --prefix frontend
COPY --chown=node:node frontend frontend
RUN npm run build --prefix frontend

# ---------- PRODUCCIÓN (paso 2): Express sirve la API y el build de React ----------
FROM base AS prod
ENV NODE_ENV=production
COPY --chown=node:node backend/package*.json backend/
RUN npm install --omit=dev --prefix backend
COPY --chown=node:node backend backend
COPY --chown=node:node --from=build-frontend /app/frontend/dist frontend/dist
EXPOSE 3000
CMD ["node", "backend/src/index.js"]
