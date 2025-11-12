## Getting Started

### Install

```bash
npm install @hyperdx/browser
```

### Initialize HyperDX

```js
import HyperDX from '@hyperdx/browser';

HyperDX.init({
  apiKey: '<YOUR_API_KEY_HERE>',
  service: 'my-frontend-app',
  tracePropagationTargets: [/api.myapp.domain/i], // Set to link traces from frontend to backend requests
  consoleCapture: true, // Capture console logs (default false)
  advancedNetworkCapture: true, // Capture full HTTP request/response headers and bodies (default false)
  otelResourceAttributes: {
    'service.version': '1.0.0',
    'deployment.environment': 'production',
  },
});
```

#### Options

- `apiKey` - Your HyperDX Ingestion API Key.
- `service` - The service name events will show up as in HyperDX.
- `tracePropagationTargets` - A list of regex patterns to match against HTTP
  requests to link frontend and backend traces, it will add an additional
  `traceparent` header to all requests matching any of the patterns. This should
  be set to your backend API domain (ex. `api.yoursite.com`).
- `consoleCapture` - (Optional) Capture all console logs (default `false`).
- `advancedNetworkCapture` - (Optional) Capture full request/response headers
  and bodies (default false).
- `url` - (Optional) The OpenTelemetry collector URL, only needed for
  self-hosted instances.
- `maskAllInputs` - (Optional) Whether to mask all input fields in session
  replay (default `false`).
- `maskAllText` - (Optional) Whether to mask all text in session replay (default
  `false`).
- `disableIntercom` - (Optional) Whether to disable Intercom integration (default `false`)
- `otelResourceAttributes` - (Optional) Object containing OpenTelemetry resource attributes to be added to all spans. These are set at the resource level and merged with default SDK attributes. Example:
  ```js
  otelResourceAttributes: {
    'service.version': '1.0.0',
    'deployment.environment': 'production',
    'custom.attribute': 'value',
  }
  ```
- `disableReplay` - (Optional) Whether to disable session replay (default `false`)
- `recordCanvas` - (Optional) Whether to record canvas elements (default `false`)
- `sampling` - (Optional) The sampling [config](https://github.com/rrweb-io/rrweb/blob/5fbb904edb653f3da17e6775ee438d81ef0bba83/docs/recipes/optimize-storage.md?plain=1#L22) in the session recording 

## Additional Configuration

### Attach User Information or Metadata

Attaching user information will allow you to search/filter sessions and events
in HyperDX. This can be called at any point during the client session. The
current client session and all events sent after the call will be associated
with the user information.

`userEmail`, `userName`, and `teamName` will populate the sessions UI with the
corresponding values, but can be omitted. Any other additional values can be
specified and used to search for events.

```js
HyperDX.setGlobalAttributes({
  userId: user.id,
  userEmail: user.email,
  userName: user.name,
  teamName: user.team.name,
  // Other custom properties...
});
```

### Auto Capture React Error Boundary Errors

If you're using React, you can automatically capture errors that occur within
React error boundaries by passing your error boundary component 
into the `attachToReactErrorBoundary` function.

```js
// Import your ErrorBoundary (we're using react-error-boundary as an example)
import { ErrorBoundary } from 'react-error-boundary';

// This will hook into the ErrorBoundary component and capture any errors that occur
// within any instance of it.
HyperDX.attachToReactErrorBoundary(ErrorBoundary);
```

### Send Custom Actions

To explicitly track a specific application event (ex. sign up, submission,
etc.), you can call the `addAction` function with an event name and optional
event metadata.

Example:

```js
HyperDX.addAction('Form-Completed', {
  formId: 'signup-form',
  formName: 'Signup Form',
  formType: 'signup',
});
```

### Enable Network Capture Dynamically

To enable or disable network capture dynamically, simply invoke the
`enableAdvancedNetworkCapture` or `disableAdvancedNetworkCapture` function as
needed.

```js
HyperDX.enableAdvancedNetworkCapture();
```

### Stop/Resume Session Recorder Dynamically

To stop or resume session recording dynamically, simply invoke the
`resumeSessionRecorder` or `stopSessionRecorder` function as needed.

```js
HyperDX.resumeSessionRecorder();
```

### Enable Resource Timing for CORS Requests

If your frontend application makes API requests to a different domain, you can
optionally enable the `Timing-Allow-Origin`
[header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Timing-Allow-Origin)
to be sent with the request. This will allow HyperDX to capture fine-grained
resource timing information for the request such as DNS lookup, response
download, etc. via
[PerformanceResourceTiming](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming).

If you're using `express` with `cors` packages, you can use the following
snippet to enable the header:

```js
var cors = require('cors');
var onHeaders = require('on-headers');

// ... all your stuff

app.use(function (req, res, next) {
  onHeaders(res, function () {
    var allowOrigin = res.getHeader('Access-Control-Allow-Origin');
    if (allowOrigin) {
      res.setHeader('Timing-Allow-Origin', allowOrigin);
    }
  });
  next();
});
app.use(cors());
```

### Retrieve Session ID

To retrieve the current session ID, you can call the `getSessionId` function.

```js
const sessionId = HyperDX.getSessionId();
```

