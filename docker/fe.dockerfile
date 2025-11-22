# Build stage
FROM node:22-alpine AS builder

WORKDIR /app
COPY web_react/package*.json ./
RUN npm i

COPY web_react/ .

CMD ["npm", "run", "dev"]