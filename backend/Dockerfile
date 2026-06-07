FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ENV PORT=5000
ENV NODE_ENV=production
ENV FRONTEND_URL=http://localhost:5173

EXPOSE 5000

CMD ["npm", "start"]
