/*
Copyright 2023 DeploySentinel Inc.

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

import * as shimmer from 'shimmer';
import { SpanKind } from '@opentelemetry/api';
import {
  InstrumentationBase,
  InstrumentationConfig,
} from '@opentelemetry/instrumentation';
import isObject from 'lodash/isObject';
import isPlainObject from 'lodash/isPlainObject';
import isString from 'lodash/isString';

import { VERSION } from './version';
import { jsonToString } from './utils';

const MODULE_NAME = 'console';

// https://github.com/hyperdxio/hyperdx-js/blob/a56eba79af59fc81698eacc25cad00f38581de9b/packages/node-opentelemetry/src/patch.ts#L15
export const _parseConsoleArgs = (args: any[]) => {
  const stringifiedArgs: any[] = [];
  let firstJson;
  for (const arg of args) {
    if (isObject(arg)) {
      if (firstJson == null && isPlainObject(arg)) {
        firstJson = arg;
      }
      try {
        const stringifiedArg = JSON.stringify(arg);
        if (stringifiedArg != null) {
          stringifiedArgs.push(stringifiedArg);
        }
      } catch (e) {
        // ignore
      }
    } else {
      stringifiedArgs.push(arg);
    }
  }

  return firstJson
    ? {
        ...firstJson,
        // FIXME: we probably don't want to override 'message' field in firstJson
        ...(args.length > 1 && { message: stringifiedArgs.join(' ') }),
      }
    : stringifiedArgs.join(' ');
};

export class HyperDXConsoleInstrumentation extends InstrumentationBase {
  private _createSpan(type: string, ...args: any[]) {
    const now = Date.now();
    const message = _parseConsoleArgs(args);
    const bodyMsg = isString(message) ? message : jsonToString(message);
    const span = this.tracer.startSpan(`console.${type}`, {
      kind: SpanKind.INTERNAL,
      startTime: now,
    });
    let level = type;
    if (type === 'log') {
      level = 'info';
    }
    span.setAttribute('component', MODULE_NAME);
    span.setAttribute('level', level);
    span.setAttribute('message', bodyMsg);
    if (isPlainObject(message)) {
      span.setAttributes(message);
    }
    span.end(now);
  }

  private readonly _consoleLogHandler = (original: Console['log']) => {
    return (...args: any[]) => {
      this._createSpan('log', ...args);
      return original.apply(this, args);
    };
  };

  private readonly _consoleInfoHandler = (original: Console['info']) => {
    return (...args: any[]) => {
      this._createSpan('info', ...args);
      return original.apply(this, args);
    };
  };

  private readonly _consoleWarnHandler = (original: Console['warn']) => {
    return (...args: any[]) => {
      this._createSpan('warn', ...args);
      return original.apply(this, args);
    };
  };

  private readonly _consoleDebugHandler = (original: Console['debug']) => {
    return (...args: any[]) => {
      this._createSpan('debug', ...args);
      return original.apply(this, args);
    };
  };

  constructor(config: InstrumentationConfig = {}) {
    super(MODULE_NAME, VERSION, Object.assign({}, config));
  }

  init(): void {}

  enable(): void {
    shimmer.wrap(console, 'debug', this._consoleDebugHandler);
    shimmer.wrap(console, 'info', this._consoleInfoHandler);
    shimmer.wrap(console, 'log', this._consoleLogHandler);
    shimmer.wrap(console, 'warn', this._consoleWarnHandler);
  }

  disable(): void {
    shimmer.unwrap(console, 'debug');
    shimmer.unwrap(console, 'info');
    shimmer.unwrap(console, 'log');
    shimmer.unwrap(console, 'warn');
  }
}
