import api, { Span, SpanKind, Tracer, diag } from '@opentelemetry/api';
import { ExceptionEventName } from '@opentelemetry/sdk-trace-base/build/src/enums';
import {
  InstrumentationBase,
  InstrumentationNodeModuleDefinition,
} from '@opentelemetry/instrumentation';
import {
  SEMATTRS_EXCEPTION_MESSAGE,
  SEMATTRS_EXCEPTION_STACKTRACE,
  SEMATTRS_EXCEPTION_TYPE,
  SEMATTRS_HTTP_STATUS_CODE,
  SEMATTRS_HTTP_RESPONSE_CONTENT_LENGTH,
} from '@opentelemetry/semantic-conventions';
import Sentry from '@sentry/node';
import { Event, EventHint, Exception, EventProcessor } from '@sentry/types';

import { SentryNodeInstrumentationConfig } from './types';
import { jsonToString } from './utils';
import { name as PKG_NAME, version as PKG_VERSION } from '../package.json';

const defaultTracer = api.trace.getTracer(PKG_NAME, PKG_VERSION);

// To prevent from adding the same event processor multiple times
const REGISTERED_EVENT_PROCESSOR_VERSIONS = new Set<string>();

// CUSTOM SEMANTIC CONVENTIONS
const SEMATTRS_EXCEPTION_MECHANISM = 'exception.mechanism';
const SEMATTRS_EXCEPTION_MODULE = 'exception.module';
const SEMATTRS_EXCEPTION_MODULES = 'exception.modules';
const SEMATTRS_EXCEPTION_TAGS = 'exception.tags';
const SEMATTRS_EXCEPTION_THREAD_ID = 'exception.thread_id';
const SEMATTRS_SENTRY_VERSION = 'sentry.version';

// https://github.com/open-telemetry/opentelemetry-js/blob/ca027b5eed282b4e81e098ca885db9ce27fdd562/packages/opentelemetry-sdk-trace-base/src/Span.ts#L299
const _recordException = (span: Span, exception: Exception) => {
  span.addEvent(ExceptionEventName, {
    [SEMATTRS_EXCEPTION_MESSAGE]: exception.value,
    [SEMATTRS_EXCEPTION_STACKTRACE]: jsonToString(exception.stacktrace),
    [SEMATTRS_EXCEPTION_TYPE]: exception.type,
    ...(exception.mechanism && {
      [SEMATTRS_EXCEPTION_MECHANISM]: jsonToString(exception.mechanism),
    }),
    ...(exception.module && {
      [SEMATTRS_EXCEPTION_MODULE]: exception.module,
    }),
    ...(exception.thread_id && {
      [SEMATTRS_EXCEPTION_THREAD_ID]: exception.thread_id,
    }),
  });
};

const _isSentryEventAnException = (event: Event) =>
  event.exception?.values?.length > 0;

// TODO: enrich span with more info
const _buildSingleSpanName = (event: Event) =>
  [event.exception?.values[0].type, event.transaction].join(' ');

const _startOtelSpanFromSentryEvent = ({
  event,
  hint,
  sentryVersion,
  tracer,
}: {
  event: Event;
  hint: EventHint;
  sentryVersion?: string;
  tracer: Tracer;
}) => {
  // FIXME: can't attach to the active span
  // since Sentry would overwrite the active span
  // let span = api.trace.getActiveSpan();
  let span = null;
  let isRootSpan = false;
  const startTime = event.timestamp * 1000;
  const attributes = {
    ...(sentryVersion && {
      [SEMATTRS_SENTRY_VERSION]: sentryVersion,
    }),
    ...(event.modules && {
      [SEMATTRS_EXCEPTION_MODULES]: jsonToString(event.modules),
    }),
    // TODO: decide what to do with these sentry specific tags
    [SEMATTRS_EXCEPTION_TAGS]: jsonToString({
      culture: event.contexts?.culture,
      dist: event.dist,
      environment: event.environment,
      mechanism: hint.mechanism,
      release: event.release,
    }),
    ...(event.contexts?.app && {
      'app.build_type': event.contexts.app.build_type,
      'app.id': event.contexts.app.app_identifier,
      'app.memory': event.contexts.app.app_memory,
      'app.name': event.contexts.app.app_name,
      'app.start_time': event.contexts.app.app_start_time,
      'app.version': event.contexts.app.app_version,
    }),
    // https://opentelemetry.io/docs/specs/semconv/http/http-spans/
    ...(event.contexts?.response && {
      [SEMATTRS_HTTP_STATUS_CODE]: event.contexts.response.status_code,
      [SEMATTRS_HTTP_RESPONSE_CONTENT_LENGTH]:
        event.contexts.response.body_size,
      ...(event.contexts.response.headers &&
        Object.entries(event.contexts.response.headers).reduce(
          (acc, [key, value]) => {
            acc[`http.response.header.${key}`] = value;
            return acc;
          },
        ),
      {}),
    }),
    // https://opentelemetry.io/docs/specs/semconv/resource/cloud/
    ...(event.contexts?.cloud_resource && {
      'cloud.provider': event.contexts.cloud_resource['cloud.provider'],
      'cloud.account.id': event.contexts.cloud_resource['cloud.account.id'],
      'cloud.region': event.contexts.cloud_resource['cloud.region'],
      'cloud.availability_zone':
        event.contexts.cloud_resource['cloud.availability_zone'],
      'cloud.platform': event.contexts.cloud_resource['cloud.platform'],
      'host.id': event.contexts.cloud_resource['host.id'],
      'host.type': event.contexts.cloud_resource['host.type'],
    }),
    // https://opentelemetry.io/docs/specs/semconv/resource/os/
    ...(event.contexts?.os && {
      'os.build_id': event.contexts.os.build,
      'os.kernel_version': event.contexts.os.kernel_version,
      'os.type': event.contexts.os.name,
      'os.version': event.contexts.os.version,
    }),
    ...(event.contexts?.device && {
      // https://opentelemetry.io/docs/specs/semconv/resource/device/
      'device.id': event.contexts.device.device_unique_identifier,
      'device.manufacturer': event.contexts.device.manufacturer,
      'device.model.identifier': event.contexts.device.model_id,
      'device.model.name': event.contexts.device.model,
      // NOT FROM OTEL SPECS
      // TODO: do we want to separate device by type? ex: browser vs mobile
      'device.type': event.contexts.device.device_type,
      'device.battery_level': event.contexts.device.battery_level,
      'device.battery_status': event.contexts.device.battery_status,
      'device.orientation': event.contexts.device.orientation,
      'device.brand': event.contexts.device.brand,
      'device.sreen_resolution': event.contexts.device.screen_resolution,
      'device.screen_height_pixels': event.contexts.device.screen_height_pixels,
      'device.screen_width_pixels': event.contexts.device.screen_width_pixels,
      'device.screen_density': event.contexts.device.screen_density,
      'device.screen_dpi': event.contexts.device.screen_dpi,
      'device.online': event.contexts.device.online,
      'device.charging': event.contexts.device.charging,
      'device.supports_vibration': event.contexts.device.supports_vibration,
      'device.supports_accelerometer':
        event.contexts.device.supports_accelerometer,
      'device.supports_gyroscope': event.contexts.device.supports_gyroscope,
      'device.supports_audio': event.contexts.device.supports_audio,
      'device.supports_location_service':
        event.contexts.device.supports_location_service,
      'device.boot_time': event.contexts.device.boot_time,
      'device.low_memory': event.contexts.device.low_memory,
      'device.simulator': event.contexts.device.simulator,
      'device.memory_size': event.contexts.device.memory_size,
      'device.free_memory': event.contexts.device.free_memory,
      'device.usable_memory': event.contexts.device.usable_memory,
      'device.storage_size': event.contexts.device.storage_size,
      'device.free_storage': event.contexts.device.free_storage,
      'device.external_storage_size':
        event.contexts.device.external_storage_size,
      'device.external_free_storage':
        event.contexts.device.external_free_storage,
      // https://opentelemetry.io/docs/specs/semconv/resource/host/
      'host.cpu.model.name': event.contexts.device.cpu_description,
      'host.cpu.count': event.contexts.device.processor_count,
      'host.cpu.frequency': event.contexts.device.processor_frequency,
    }),
    // https://opentelemetry.io/docs/specs/semconv/resource/host/
    ...(event.server_name && {
      'host.name': event.server_name,
    }),
  };
  if (span == null) {
    isRootSpan = true;
    span = tracer.startSpan(_buildSingleSpanName(event), {
      attributes,
      startTime,
      kind: SpanKind.INTERNAL,
    });
  }
  // record exceptions
  for (const exception of event.exception?.values ?? []) {
    _recordException(span, exception);
  }

  if (isRootSpan) {
    span.end(startTime);
  }
};

// in case Sentry instrumentation doesn't work
export const getEventProcessor = (tracer?: Tracer, sentryVersion?: string) => {
  let _alreadyRegistered = false;
  if (sentryVersion) {
    if (REGISTERED_EVENT_PROCESSOR_VERSIONS.has(sentryVersion)) {
      _alreadyRegistered = true;
      diag.debug('Sentry event processor already registered, skipping');
    } else {
      REGISTERED_EVENT_PROCESSOR_VERSIONS.add(sentryVersion);
    }
  }
  return (event: Event, hint: EventHint) => {
    try {
      diag.debug('Received Sentry event', event);
      if (!_alreadyRegistered && _isSentryEventAnException(event)) {
        let _tracer = tracer;
        if (_tracer == null) {
          _tracer = defaultTracer;
          diag.debug('Using default tracer');
        }
        _startOtelSpanFromSentryEvent({
          event,
          hint,
          sentryVersion,
          tracer: _tracer,
        });
      }
    } catch (e) {
      diag.debug(`Error processing event: ${e}`);
    }
    // WARNING: always return the event
    return event;
  };
};

/** Sentry instrumentation for OpenTelemetry */
export class SentryNodeInstrumentation extends InstrumentationBase {
  private _hasRegisteredEventProcessor = false;

  constructor(config: SentryNodeInstrumentationConfig = {}) {
    super(PKG_NAME, PKG_VERSION, config);
  }

  override setConfig(config: SentryNodeInstrumentationConfig = {}) {
    this._config = Object.assign({}, config);
  }

  override getConfig(): SentryNodeInstrumentationConfig {
    return this._config as SentryNodeInstrumentationConfig;
  }

  init() {
    return [
      new InstrumentationNodeModuleDefinition(
        '@sentry/node',
        ['^7.0.0', '^8.0.0'],
        (moduleExports: typeof Sentry) => {
          diag.debug(
            `Detected Sentry installed with SDK version: ${moduleExports.SDK_VERSION}`,
          );
          const client = moduleExports.getCurrentHub()?.getClient();
          if (!client) {
            diag.info('Sentry client not found');
          }

          if (this._hasRegisteredEventProcessor) {
            diag.debug('Sentry event processor already registered');
            return moduleExports;
          }

          const instrumentation = this;

          if (typeof moduleExports.addGlobalEventProcessor === 'function') {
            diag.debug('Sentry.addGlobalEventProcessor is available');
            moduleExports.addGlobalEventProcessor(
              getEventProcessor(
                instrumentation.tracer,
                moduleExports.SDK_VERSION,
              ),
            );
            this._hasRegisteredEventProcessor = true;
            diag.debug('Registered Sentry event hooks');
            return moduleExports;
          }
          if (typeof moduleExports.addEventProcessor === 'function') {
            diag.debug('Sentry.addEventProcessor is available');
            moduleExports.addEventProcessor(
              getEventProcessor(
                instrumentation.tracer,
                moduleExports.SDK_VERSION,
              ),
            );
            this._hasRegisteredEventProcessor = true;
            diag.debug('Registered Sentry event hooks');
            return moduleExports;
          }
          diag.error('Sentry event processor not found');
          return moduleExports;
        },
        (moduleExports) => {
          // TODO: do we need to remove the event processor?
        },
      ),
    ];
  }
}
