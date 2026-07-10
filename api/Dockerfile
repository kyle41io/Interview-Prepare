FROM node:18-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
# Strip devDependencies from node_modules now that the build is done, so the
# runtime image below doesn't ship them.
RUN npm prune --omit=dev

FROM node:18-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main.js"]
