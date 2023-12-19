import { PassThrough, Readable } from 'stream';

import { _parseConsoleArgs } from '../src/instrumentations/console';
import {
  getShouldRecordBody,
  interceptReadableStream,
  splitCommaSeparatedStrings,
} from '../src/instrumentations/http';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('instrumentations', () => {
  describe('console', () => {
    it('should parse console args', () => {
      expect(_parseConsoleArgs([])).toEqual('');
      expect(_parseConsoleArgs(['foo'])).toEqual('foo');
      expect(_parseConsoleArgs(['foo', 'bar'])).toEqual('foo bar');
      expect(_parseConsoleArgs([{ foo: 'bar' }])).toEqual({ foo: 'bar' });
      expect(
        _parseConsoleArgs([
          () => 1,
          function () {
            const i = 1;
          },
        ]),
      ).toEqual('');
      expect(_parseConsoleArgs(['foo', { foo: 'bar' }])).toEqual({
        foo: 'bar',
        message: 'foo {"foo":"bar"}',
      });
      expect(_parseConsoleArgs(['foo', [1, 2, 3]])).toEqual('foo [1,2,3]');
      expect(_parseConsoleArgs(['foo', [1, 2, 3], { foo: 'bar' }])).toEqual({
        foo: 'bar',
        message: 'foo [1,2,3] {"foo":"bar"}',
      });
      expect(
        _parseConsoleArgs([
          'foo',
          [1, 2, 3],
          { foo: 'bar', message: 'this will be overwritten' },
        ]),
      ).toEqual({
        foo: 'bar',
        message:
          'foo [1,2,3] {"foo":"bar","message":"this will be overwritten"}',
      });
    });
  });

  describe('http', () => {
    it('splitCommaSeparatedStrings', () => {
      expect(splitCommaSeparatedStrings()).toBeUndefined();
      expect(splitCommaSeparatedStrings('')).toEqual(['']);
      expect(splitCommaSeparatedStrings('foo')).toEqual(['foo']);
      expect(splitCommaSeparatedStrings('foo ,bar ')).toEqual(['foo', 'bar']);
    });

    it('getShouldRecordBody', () => {
      const defaultShouldRecordBody = getShouldRecordBody();
      expect(defaultShouldRecordBody('foo bar')).toEqual(true);
      expect(defaultShouldRecordBody('pasSwoRd: abc')).toEqual(false);
      expect(defaultShouldRecordBody('secret: abc')).toEqual(false);

      const customShouldRecordBody = getShouldRecordBody('foo,bar');
      expect(customShouldRecordBody('foo hello world')).toEqual(false);
      expect(customShouldRecordBody('hello world')).toEqual(true);
    });

    describe('interceptReadableStream', () => {
      it('should not affect the original stream state', () => {
        const mockEventStream = new Readable({
          read() {
            return this.push(null);
          },
        });
        interceptReadableStream(mockEventStream, new PassThrough());
        expect(mockEventStream.readableFlowing).toEqual(null);
        mockEventStream.pause();
        interceptReadableStream(mockEventStream, new PassThrough());
        expect(mockEventStream.readableFlowing).toEqual(false);
        mockEventStream.resume();
        interceptReadableStream(mockEventStream, new PassThrough());
        expect(mockEventStream.readableFlowing).toEqual(true);
      });

      it('on "data" event should stream data', async () => {
        let i = 0;
        const mockEventStream = new Readable({
          objectMode: true,
          read() {
            if (i < 3) {
              i++;
              return this.push(
                JSON.stringify({
                  message: `foo ${i}`,
                }),
              );
            } else {
              return this.push(null);
            }
          },
        });

        const pt = new PassThrough();

        // interceptor should not affect the original stream
        const dataFromPT = [];
        pt.on('data', (data) => {
          dataFromPT.push(data.toString());
        });

        interceptReadableStream(mockEventStream, pt);

        const dataFromDownSreamReader = [];
        setTimeout(() => {
          mockEventStream.on('data', (data) => {
            dataFromDownSreamReader.push(data);
          });
        }, 10);

        // wait for the stream to end
        await new Promise((resolve) => {
          mockEventStream.on('end', () => {
            resolve(null);
          });
        });

        expect(dataFromPT).toEqual([
          '{"message":"foo 1"}',
          '{"message":"foo 2"}',
          '{"message":"foo 3"}',
        ]);
        expect(dataFromDownSreamReader).toEqual([
          '{"message":"foo 1"}',
          '{"message":"foo 2"}',
          '{"message":"foo 3"}',
        ]);
      });

      it('async iterator should stream data', async () => {
        let i = 0;
        const mockEventStream = new Readable({
          objectMode: true,
          read() {
            if (i < 3) {
              i++;
              return this.push(
                JSON.stringify({
                  message: `foo ${i}`,
                }),
              );
            } else {
              return this.push(null);
            }
          },
        });

        const pt = new PassThrough();

        // interceptor should not affect the original stream
        const dataFromPT = [];
        pt.on('data', (data) => {
          dataFromPT.push(data.toString());
        });

        interceptReadableStream(mockEventStream, pt);

        const dataFromDownSreamReader = [];
        setTimeout(async () => {
          for await (const data of mockEventStream) {
            dataFromDownSreamReader.push(data);
          }
        }, 10);

        // wait for the stream to end
        await new Promise((resolve) => {
          mockEventStream.on('end', () => {
            resolve(null);
          });
        });

        expect(dataFromPT).toEqual([
          '{"message":"foo 1"}',
          '{"message":"foo 2"}',
          '{"message":"foo 3"}',
        ]);
        expect(dataFromDownSreamReader).toEqual([
          '{"message":"foo 1"}',
          '{"message":"foo 2"}',
          '{"message":"foo 3"}',
        ]);
      });

      it('pause stream, attach passthrough and resume afterward', async () => {
        let i = 0;
        const mockEventStream = new Readable({
          objectMode: true,
          read() {
            if (i < 3) {
              i++;
              return this.push(
                JSON.stringify({
                  message: `foo ${i}`,
                }),
              );
            } else {
              return this.push(null);
            }
          },
        });
        mockEventStream.pause();

        const pt = new PassThrough();
        // interceptor should not affect the original stream
        const dataFromPT = [];
        pt.on('data', (data) => {
          dataFromPT.push(data.toString());
        });

        interceptReadableStream(mockEventStream, pt);

        const dataFromDownSreamReader = [];
        mockEventStream.on('data', (data) => {
          dataFromDownSreamReader.push(data);
        });

        // the stream should not start flowing
        expect(dataFromPT.length).toEqual(0);
        expect(dataFromDownSreamReader.length).toEqual(0);

        mockEventStream.resume();

        // wait for the stream to end
        await new Promise((resolve) => {
          mockEventStream.on('end', () => {
            resolve(null);
          });
        });

        expect(dataFromPT).toEqual([
          '{"message":"foo 1"}',
          '{"message":"foo 2"}',
          '{"message":"foo 3"}',
        ]);
        expect(dataFromDownSreamReader).toEqual([
          '{"message":"foo 1"}',
          '{"message":"foo 2"}',
          '{"message":"foo 3"}',
        ]);
      });
    });
  });
});
