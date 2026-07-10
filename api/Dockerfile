FROM node:18-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx prisma generate --schema src/prisma/schema.prisma && npm run build
# Strip devDependencies from node_modules now that build + client generation
# are done, so the runtime image below doesn't ship them.
RUN npm prune --omit=dev

FROM node:18-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/prisma ./src/prisma
EXPOSE 3000
CMD ["node", "dist/main.js"]
