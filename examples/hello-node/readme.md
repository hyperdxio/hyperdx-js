# Hello World example

## Overview

This example illustrates a simple hello world using a local dependency. The eslint is currently disabled because this directory is ignored - please enable it for future development.

## Usage

### Install and setup

```bash
npm run setup
```

### Running the main application

```bash
HYPERDX_API_KEY={apikey} OTEL_SERVICE_NAME="hello-node" npm start
```

Alternatively, to export telemetry using `gRPC` instead of `http/protobuf`:

```bash
HYPERDX_API_KEY={apikey} OTEL_SERVICE_NAME="hello-node" OTEL_EXPORTER_OTLP_PROTOCOL=grpc npm start
```
