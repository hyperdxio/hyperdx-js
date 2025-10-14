FROM node:18

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
