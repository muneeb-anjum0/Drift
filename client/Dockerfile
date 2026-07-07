FROM node:22-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json client/package.json
RUN npm ci --workspace client

COPY client client
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_DRIFT_MODEL_LABEL="Qwen2.5-7B + DriftLedger LoRA (GGUF Q4_K_M)"
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_DRIFT_MODEL_LABEL=$VITE_DRIFT_MODEL_LABEL
RUN npm run build --workspace client

FROM nginx:1.27-alpine
COPY client/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/client/dist /usr/share/nginx/html
EXPOSE 80
