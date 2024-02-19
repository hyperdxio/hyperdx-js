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
RUN cd ./examples/hello-node-express/ && npm run setup

# run example express app
CMD [ "node", "./examples/hello-node-express/index.js" ]
