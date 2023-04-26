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
});
```

### (Optional) Attach User Information or Metadata

Attaching user information will allow you to search/filter sessions and events in HyperDX. This can be called at any point during the client session. The current client session and all events sent after the call will be associated with the user information.

`userEmail`, `userName`, and `teamName` will populate the sessions UI with the corresponding values, but can be omitted. Any other additional values can be specified and used to search for events.

```js
HyperDX.setGlobalAttributes({
  userEmail: user.email,
  userName: user.name,
  teamName: user.team.name,
  // Other custom properties...
});
```
