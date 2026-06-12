# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY package.json yarn.lock* .yarnrc.yml* ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build

# ── Stage 2: Production (nginx) ───────────────────────────────────────────────
FROM nginx:1.27-alpine AS prod
COPY --from=builder /app/dist /usr/share/nginx/html
# nginx.conf injecté via ConfigMap Helm au runtime
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

# ── Stage 3: Développement (Vite dev server) ──────────────────────────────────
FROM node:20-alpine AS dev
WORKDIR /app
RUN corepack enable
COPY package.json yarn.lock* .yarnrc.yml* ./
RUN yarn install
COPY . .
EXPOSE 5173
CMD ["yarn", "dev", "--host", "0.0.0.0"]
