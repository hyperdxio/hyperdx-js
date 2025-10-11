FROM node:18

# Create app directory
WORKDIR /usr/src/app
# copy everything from root directory (using docker-compose)
COPY . ./

# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
COPY . .

EXPOSE 3000

# Enable corepack for yarn v4 support
RUN corepack enable

# Install root dependencies first (required for yarn v4 workspaces)
RUN yarn install

# Build only the required package
RUN yarn workspace @hyperdx/node-opentelemetry run build

# Setup example app dependencies
RUN cd ./packages/node-opentelemetry && yarn link && cd ../../examples/hello-node && yarn install && yarn link @hyperdx/node-opentelemetry

# run example script from root package.json
CMD [ "yarn", "run", "example-node" ]
