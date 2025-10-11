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

# Install root dependencies first (required for yarn v4 workspaces)
RUN yarn install

# Build only the required package (use yarn run to access binaries from root)
RUN cd ./packages/node-opentelemetry && yarn run build

# Setup example app dependencies
RUN cd ./packages/node-opentelemetry && yarn link && cd ../../examples/hello-node-express && yarn install && yarn link @hyperdx/node-opentelemetry

# run example express app
CMD [ "node", "./examples/hello-node-express/index.js" ]
