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

# symlink hyperdx sdk dependency
RUN cd ./examples/hello-node/ && npm run setup

# run example script from root package.json
CMD [ "npm", "run", "example-node" ]
