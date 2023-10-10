FROM oven/bun:latest

COPY package.json ./
COPY bun.lockb ./

RUN bun install

COPY action.ts ./
COPY src src

CMD [ "bun", "run", "./action.ts" ]
