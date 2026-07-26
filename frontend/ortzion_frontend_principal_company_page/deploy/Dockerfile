# ---- Build (Node) ----
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# `ng build` prerenderiza todas as rotas (RenderMode.Prerender em app.routes.server.ts)
RUN npm run build

# ---- Runtime (nginx servindo apenas o estático) ----
FROM nginx:stable-alpine

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf

# Ajuste o caminho se o nome do projeto no angular.json for diferente
COPY --from=build /app/dist/ortzion_frontend_principal_company_page/browser /usr/share/nginx/html

EXPOSE 80
