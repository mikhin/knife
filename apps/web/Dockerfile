FROM node:24-slim AS build

RUN corepack enable
WORKDIR /repo

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/contract packages/contract
COPY packages/universe/package.json packages/universe/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile --filter @knife/web...

# The core arrives after the install: its sources change far more often than
# its manifest, and copying them earlier would refetch the whole tree.
COPY packages/universe packages/universe
COPY apps/web apps/web
WORKDIR /repo/apps/web
RUN pnpm build

FROM nginx:1.27-alpine AS runtime
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
