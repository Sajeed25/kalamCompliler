# ---- build ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY scripts ./scripts
RUN npm ci --no-audit --no-fund
COPY . .
ARG VITE_API_BASE=""
RUN npx tsc -b && npx vite build

# ---- serve ----
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx-headers.conf /etc/nginx/snippets/kalam-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
