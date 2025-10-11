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

# symlink hyperdx sdk dependency
RUN cd ./examples/hello-node/ && yarn run setup

# run example script from root package.json
CMD [ "yarn", "run", "example-node" ]
