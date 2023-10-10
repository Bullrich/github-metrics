FROM oven/bun:latest

COPY package.json ./
COPY bun.lockb ./

RUN bun install

COPY index.ts ./
COPY src src

RUN bun run index.ts
