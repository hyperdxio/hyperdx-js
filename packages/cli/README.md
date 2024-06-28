# Command Line Interface for HyperDX

## Uploading source maps to HyperDX

In your build pipeline, you will need to run the CLI tool. Here's how to run it:

```sh
npx @hyperdx/cli upload-sourcemaps --path="/path/to/sourcemaps" --serviceKey="your-service-account-api-key"
```

You can also add this as an npm script

```json
// In package.json

{
  "scripts": {
    "upload-sourcemaps": "npx @hyperdx/cli upload-sourcemaps --path=\"/path/to/sourcemaps\""
  }
}
```

Optionally, you can set the `HYPERDX_SERVICE_KEY` environment variable to avoid passing the `serviceKey` flag.

## Contributing

You can test your changes locally by running the following commands:

```sh
yarn build
node dist/index.js upload ...
```
