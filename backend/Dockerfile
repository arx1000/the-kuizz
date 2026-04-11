FROM node:20-alpine

WORKDIR /app

COPY ./backend/package*.json ./

RUN npm install

COPY ./backend .

COPY ./frontend ./frontend

ENV NODE_ENV=production

EXPOSE 3001

CMD ["npm", "start"]
