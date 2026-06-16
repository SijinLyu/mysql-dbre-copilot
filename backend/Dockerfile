FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install --production=false
COPY . .
RUN npx tsc

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
EXPOSE 3001
CMD ["node", "dist/index.js"]
