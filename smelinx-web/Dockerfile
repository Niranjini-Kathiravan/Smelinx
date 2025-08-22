FROM node:20-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN npm i -g pnpm && pnpm install
COPY . .
EXPOSE 3000
CMD ["pnpm","dev","-p","3000"]

