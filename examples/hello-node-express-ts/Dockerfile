FROM node:16

# Create app directory
WORKDIR /usr/src/app

# copy everything from root directory (must use smoke-tests/docker-compose)
COPY . ./

# Bundle app source
COPY . .

# example app listens on port 3000
EXPOSE 3000

# symlink hyperdx sdk dependency
RUN cd ./examples/hello-node-express-ts/ && npm run setup && npm run build

# run example express app
CMD [ "node", "-r", "./examples/hello-node-express-ts/dist/instrumentation.js", "./examples/hello-node-express-ts/dist/index.js" ]
