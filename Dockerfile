# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build


# Production stage
FROM node:22-alpine AS production

WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "dist/main.js"]