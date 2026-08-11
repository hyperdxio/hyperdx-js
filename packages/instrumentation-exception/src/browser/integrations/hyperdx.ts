import { defineIntegration } from '@sentry/core';
import type { Event, IntegrationFn, StackFrame } from '@sentry/types';

const INTEGRATION_NAME = 'HyperDX';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface HyperDXOptions {}

export const _hyperdxIntegration = ((options: HyperDXOptions = {}) => {
  return {
    name: INTEGRATION_NAME,
    processEvent(event) {
      // event.release = 'blabla' // TODO: get this right
      const possibleEventMessages = _getPossibleEventMessages(event);
      if (possibleEventMessages.length > 0) {
        event.message = possibleEventMessages[possibleEventMessages.length - 1];
      }
      // filter out useless stack traces
      const exceptions = event.exception?.values;
      if (exceptions && exceptions.length > 0) {
        for (const exception of exceptions) {
          if (exception.stacktrace?.frames) {
            const _filteredFrames: StackFrame[] = [];
            let shouldRemoveNextFrameIfSameFile: string | null = null;

            for (let i = exception.stacktrace.frames.length - 1; i >= 0; i--) {
              const frame = exception.stacktrace.frames[i];
              // remove all frames from framework-*.js (nextjs)
              if (frame.filename?.includes('framework-')) {
                continue;
                // remove frames caused by SDK
              } else if (
                frame.function?.endsWith('hdxReportString') ||
                frame.function?.endsWith('hdxReportError') ||
                frame.function?.endsWith('hdxReportErrorEvent') ||
                frame.function?.endsWith('hdxReportEvent')
              ) {
                continue;
                // console.errors are caught and reported by the SDK in this sequence:
                // anon fn -> reportString -> report
                // this condition removes the anon fn after .reportString ans .report frames
              } else if (frame.function?.endsWith('hdxReport')) {
                shouldRemoveNextFrameIfSameFile = frame.filename;
                continue;
              } else if (
                shouldRemoveNextFrameIfSameFile &&
                frame.filename === shouldRemoveNextFrameIfSameFile
              ) {
                shouldRemoveNextFrameIfSameFile = null;
                continue;
              }
              _filteredFrames.unshift(frame);
            }

            exception.stacktrace.frames = _filteredFrames;
          }
        }
      }

      return event;
    },
  };
}) satisfies IntegrationFn;

export const hyperdxIntegration = defineIntegration(_hyperdxIntegration);

// https://github.com/getsentry/sentry-javascript/blob/41b8f7926b347c286455127f9262c4da01c68e4f/packages/core/src/integrations/inboundfilters.ts#L134
function _getPossibleEventMessages(event: Event): string[] {
  const possibleMessages: string[] = [];

  if (event.message) {
    possibleMessages.push(event.message);
  }

  let lastException;
  try {
    lastException = event.exception.values[event.exception.values.length - 1];
  } catch (e) {
    // try catching to save bundle size checking existence of variables
  }

  if (lastException) {
    if (lastException.value) {
      possibleMessages.push(lastException.value);
      if (lastException.type) {
        possibleMessages.push(`${lastException.type}: ${lastException.value}`);
      }
    }
  }

  return possibleMessages;
}
