# Command Line Interface for HyperDX

Command line tool for [HyperDX](https://www.hyperdx.io/). Currently supports
uploading JavaScript sourcemaps so stack traces can be symbolicated in HyperDX.

## Installation

Run on demand with `npx` (no install required):

```sh
npx @hyperdx/cli upload-sourcemaps --path /path/to/sourcemaps --serviceKey your-service-account-api-key
```

Or install it as a dev dependency:

```sh
npm install --save-dev @hyperdx/cli
```

## Uploading source maps

In your build pipeline, run the `upload-sourcemaps` command after your build has
produced sourcemaps:

```sh
npx @hyperdx/cli upload-sourcemaps --path /path/to/sourcemaps --serviceKey your-service-account-api-key
```

You can also add it as an npm script. Set the `HYPERDX_SERVICE_KEY` environment
variable so you don't have to pass `--serviceKey` on the command line:

```json
// In package.json
{
  "scripts": {
    "upload-sourcemaps": "hyperdx upload-sourcemaps --path ./dist"
  }
}
```

### Options

| Flag                    | Alias  | Description                                                                                        | Default       |
| ----------------------- | ------ | -------------------------------------------------------------------------------------------------- | ------------- |
| `--serviceKey <string>` | `-k`   | The HyperDX service account API key. Falls back to the `HYPERDX_SERVICE_KEY` environment variable. | —             |
| `--path [string]`       | `-p`   | Directory containing the sourcemaps.                                                               | `.`           |
| `--apiUrl [string]`     | `-u`   | API URL for self-hosted deployments (e.g. `http://localhost:8000`).                                | HyperDX Cloud |
| `--releaseId [string]`  | `-rid` | Associate the uploaded sourcemaps with a release id.                                               | —             |
| `--basePath [string]`   | `-bp`  | Base path to prepend to the uploaded sourcemap paths.                                              | —             |
| `--apiVersion [string]` |        | The API version to use (`v1` or `v2`).                                                             | `v1`          |

### Self-hosted deployments

Point the CLI at your own collector/API with `--apiUrl`:

```sh
npx @hyperdx/cli upload-sourcemaps \
  --path ./dist \
  --serviceKey your-service-account-api-key \
  --apiUrl http://localhost:8000
```

## Contributing

You can test your changes locally by building the package and invoking the
compiled entry point:

```sh
yarn build
node dist/index.js upload-sourcemaps --path ./path/to/sourcemaps
```

## License

MIT
