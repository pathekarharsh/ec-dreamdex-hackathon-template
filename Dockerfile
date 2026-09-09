FROM node:24-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY typescript/package*.json ./typescript/
RUN npm --prefix typescript ci --omit=dev
COPY typescript ./typescript
CMD ["npm", "run", "agent"]
