/*
Copyright 2020 Splunk Inc.

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

module.exports = {
  '@tags': ['safari-10.1'],
  'No spans sent when no beacon url set': async function (browser) {
    await browser.url(browser.globals.getUrl('/init/nobeacon.ejs'));
    const span = await browser.globals.findSpan(() => {
      return true;
    });
    await browser.assert.not.ok(span);
  },
  'attribute-related config should work': async function (browser) {
    browser.globals.clearReceivedSpans();
    await browser.url(browser.globals.getUrl('/init/attributes.ejs'));
    const atts = await browser.globals.findSpan(
      (span) => span.name === 'documentLoad',
    );
    await browser.assert.ok(atts);
    await browser.assert.strictEqual(atts.tags['app'], 'custom-app');
    await browser.assert.strictEqual(
      atts.tags['environment'],
      'custom-environment',
    );
    await browser.assert.strictEqual(atts.tags['key1'], 'value1');
    await browser.assert.strictEqual(atts.tags['key2'], 'value2');

    await browser.click('#clickToChangeAttributes');

    const atts2 = await browser.globals.findSpan(
      (span) => span.name === 'attributes-set',
    );
    await browser.assert.ok(atts2);
    // environment still set (not cleared by setGlobalAttributes call)
    await browser.assert.strictEqual(
      atts2.tags['environment'],
      'custom-environment',
    );
    await browser.assert.strictEqual(atts2.tags['key1'], 'newvalue1');
    await browser.assert.strictEqual(atts2.tags['key2'], 'value2');

    const attrsNotificationSpan = await browser.globals.findSpan(
      (span) => span.name === 'attributes-changed',
    );
    await browser.assert.ok(attrsNotificationSpan);

    const notifiedAttrs = JSON.parse(
      attrsNotificationSpan.tags['payload'],
    ).attributes;
    await browser.assert.strictEqual(
      notifiedAttrs.environment,
      'custom-environment',
    );
    await browser.assert.strictEqual(notifiedAttrs.key1, 'newvalue1');
    await browser.assert.strictEqual(notifiedAttrs.key2, 'value2');

    await browser.click('#clickToResetAttributes');
    // no argument setGlobalAttributes() call will set empty attributes
    const atts3 = await browser.globals.findSpan(
      (span) => span.name === 'attributes-reset',
    );
    await browser.assert.ok(atts3);
    await browser.assert.strictEqual(atts3.tags['environment'], undefined);
    await browser.assert.strictEqual(atts3.tags['key1'], undefined);
    await browser.assert.strictEqual(atts3.tags['key1'], undefined);

    await browser.globals.assertNoErrorSpans();
  },
  'instrumentations.errors controls error capture': async function (browser) {
    browser.globals.clearReceivedSpans();
    await browser.url(browser.globals.getUrl('/init/captureErrors.ejs'));
    const errorGuard = await browser.globals.findSpan(
      (span) => span.name === 'error-guard-span',
    );
    await browser.assert.ok(errorGuard);
    await browser.globals.assertNoErrorSpans();
  },
  'environment % resource attrs still get set if no global attributes':
    async function (browser) {
      browser.globals.clearReceivedSpans();
      await browser.url(
        browser.globals.getUrl('/init/attributes-no-globals.ejs'),
      );

      const atts = await browser.globals.findSpan(
        (span) => span.name === 'documentLoad',
      );
      await browser.assert.ok(atts);
      await browser.assert.strictEqual(atts.tags['app'], 'custom-app');
      await browser.assert.strictEqual(
        atts.tags['environment'],
        'custom-environment',
      );

      // Set as a resource, zipkin exporter should merge into tags
      await browser.assert.strictEqual(
        atts.tags['telemetry.sdk.name'],
        '@splunk/otel-web',
      );
      await browser.assert.strictEqual(
        atts.tags['telemetry.sdk.language'],
        'webjs',
      );
      await browser.assert.strictEqual(
        atts.tags['telemetry.sdk.version'],
        browser.globals.rumVersion,
      );
      await browser.assert.strictEqual(
        atts.tags['splunk.rumVersion'],
        browser.globals.rumVersion,
      );

      await browser.globals.assertNoErrorSpans();
    },
};
