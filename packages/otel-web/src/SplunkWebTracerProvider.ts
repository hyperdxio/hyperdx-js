/*
Copyright 2021 Splunk Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { propagation, context, trace } from '@opentelemetry/api';
import { WebTracerProvider as BaseWebTracerProvider } from '@opentelemetry/sdk-trace-web';
import type { Resource } from '@opentelemetry/resources';

export class SplunkWebTracerProvider extends BaseWebTracerProvider {
  // In OTel SDK v2, BasicTracerProvider made `resource` private (`_resource`).
  // Re-expose it so our code and session-recorder can access resource attributes.
  get resource(): Resource {
    return (this as any)._resource;
  }

  shutdown(): Promise<void> {
    return new Promise<void>((resolve) => {
      // TODO: upstream
      // note: BasicTracerProvider registers the propagator given to it in config
      // if the global propagator is the same as the one we registered, then we should deregister it
      propagation.disable();
      context.disable();
      trace.disable();
      resolve();
    }).then(() => super.shutdown());
  }
}
