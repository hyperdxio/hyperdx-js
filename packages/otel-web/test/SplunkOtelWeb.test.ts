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

import { SpanAttributes } from '@opentelemetry/api';
import { expect } from 'chai';
import Rum from '../src';
import { updateSessionStatus } from '../src/session';

describe('SplunkOtelWeb', () => {
  afterEach(() => {
    Rum.deinit();
  });

  describe('global attributes', () => {
    it('should be settable via constructor and then readable', () => {
      Rum.init({
        app: 'app-name',
        beaconUrl: 'https://beacon',
        rumAuth: '<token>',
        globalAttributes: {
          key1: 'value1',
        },
      });
      expect(Rum.getGlobalAttributes()).to.deep.eq({
        key1: 'value1',
      });
    });

    it('should be patchable via setGlobalAttributes and then readable', () => {
      Rum.init({
        app: 'app-name',
        beaconUrl: 'https://beacon',
        rumAuth: '<token>',
        globalAttributes: {
          key1: 'value1',
          key2: 'value2',
        },
      });

      Rum.setGlobalAttributes({
        key2: 'value2-changed',
        key3: 'value3',
      });

      expect(Rum.getGlobalAttributes()).to.deep.eq({
        key1: 'value1',
        key2: 'value2-changed',
        key3: 'value3',
      });
    });

    it('should notify about changes via setGlobalAttributes', async () => {
      Rum.init({
        app: 'app-name',
        beaconUrl: 'https://beacon',
        rumAuth: '<token>',
        globalAttributes: {
          key1: 'value1',
          key2: 'value2',
        },
      });

      let receivedAttributes: SpanAttributes | undefined;
      Rum.addEventListener('global-attributes-changed', ({ payload }) => {
        receivedAttributes = payload.attributes;
      });

      Rum.setGlobalAttributes({
        key2: 'value2-changed',
        key3: 'value3',
      });

      // Wait for promise chain to resolve
      await Promise.resolve();

      expect(receivedAttributes).to.deep.eq({
        key1: 'value1',
        key2: 'value2-changed',
        key3: 'value3',
      });
    });
  });

  describe('session ID', () => {
    it('should be readable', () => {
      expect(Rum.getSessionId()).to.eq(undefined);

      Rum.init({
        app: 'app-name',
        beaconUrl: 'https://beacon',
        rumAuth: '<token>',
      });
      expect(Rum.getSessionId()).to.match(/[0-9a-f]{32}/);

      Rum.deinit();
      expect(Rum.getSessionId()).to.eq(undefined);
    });

    it('should produce notifications when updated', async () => {
      let sessionId: string | undefined;

      Rum.init({
        app: 'app-name',
        beaconUrl: 'https://beacon',
        rumAuth: '<token>',
      });
      Rum.addEventListener('session-changed', (ev) => {
        sessionId = ev.payload.sessionId;
      });

      document.body.click();
      updateSessionStatus();

      // Wait for promise chain to resolve
      await Promise.resolve();

      expect(sessionId).to.match(/[0-9a-f]{32}/);
    });
  });

  describe('.inited', () => {
    it('should follow lifecycle', () => {
      expect(Rum.inited).to.eq(false, 'Should be false in the beginning.');

      Rum.init({
        app: 'app-name',
        beaconUrl: 'https://beacon',
        rumAuth: '<token>',
      });
      expect(Rum.inited).to.eq(true, 'Should be true after creating.');

      Rum.deinit();
      expect(Rum.inited).to.eq(false, 'Should be false after destroying.');
    });
  });
});
