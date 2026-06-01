FROM node:20-alpine

WORKDIR /app

COPY package.json package.json
RUN npm install --omit=dev

COPY src src

EXPOSE 3334

CMD ["npm", "start"]
