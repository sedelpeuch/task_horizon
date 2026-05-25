FROM node:20-alpine

WORKDIR /app

RUN corepack enable

COPY package.json yarn.lock* .yarnrc.yml* ./
RUN yarn install

COPY . .

EXPOSE 5173

CMD ["yarn", "dev", "--host", "0.0.0.0"]

