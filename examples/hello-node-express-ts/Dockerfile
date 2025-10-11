FROM node:18

# Create app directory
WORKDIR /usr/src/app

# copy everything from root directory (must use smoke-tests/docker-compose)
COPY . ./

# Bundle app source
COPY . .

# example app listens on port 3000
EXPOSE 3000

# Enable corepack for yarn v4 support
RUN corepack enable

# symlink hyperdx sdk dependency
RUN cd ./examples/hello-node-express-ts/ && yarn run setup && yarn run build

# run example express app
CMD [ "node", "-r", "./examples/hello-node-express-ts/dist/instrumentation.js", "./examples/hello-node-express-ts/dist/index.js" ]
