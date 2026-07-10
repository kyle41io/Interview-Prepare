FROM node:18-slim AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npx prisma generate --schema src/prisma/schema.prisma && npm run build
FROM node:18-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/prisma ./src/prisma
EXPOSE 3000
CMD ["node", "dist/main.js"]
