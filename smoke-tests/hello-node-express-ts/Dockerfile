FROM node:24

# The repo root pins Yarn 4 via the "packageManager" field; Corepack must be
# enabled so the root `yarn install` in the setup step uses it (the base image
# ships Yarn 1 globally).
RUN corepack enable

# Create app directory
WORKDIR /usr/src/app

# copy everything from root directory (must use smoke-tests/docker-compose)
COPY . ./

# Bundle app source
COPY . .

# example app listens on port 3000
EXPOSE 3000

ENV PUPPETEER_SKIP_DOWNLOAD=true

# symlink hyperdx sdk dependency
RUN cd ./smoke-tests/hello-node-express-ts/ && npm run setup && npm run build

# run example express app
CMD [ "node", "-r", "@hyperdx/node-opentelemetry/build/src/tracing", "./smoke-tests/hello-node-express-ts/dist/index.js" ]
