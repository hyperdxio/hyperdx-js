import {
  context,
  Context,
  Counter,
  Meter,
  metrics,
  propagation,
  Span,
  trace,
  Tracer,
  ValueType,
} from '@opentelemetry/api';
import express, { Express, NextFunction, Request, Response } from 'express';

const app: Express = express();
const hostname = '0.0.0.0';
const port = 3000;

// express supports async handlers but the @types definition is wrong: https://github.com/DefinitelyTyped/DefinitelyTyped/issues/50871
// eslint-disable-next-line @typescript-eslint/no-misused-promises
app.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    const sayHello = () => 'Hello world!';
    const tracer: Tracer = trace.getTracer('hello-world-tracer');
    const meter: Meter = metrics.getMeter('hello-world-meter');
    const nodeMonitorMeter: Meter = metrics.getMeter('node-monitor-meter');
    const counter: Counter = meter.createCounter('sheep');

    counter.add(1);

    const gauge = nodeMonitorMeter.createObservableGauge(
      'process.runtime.nodejs.memory.heap.total',
      {
        unit: 'By',
        valueType: ValueType.INT,
      },
    );
    gauge.addCallback((result) => {
      console.log('Getting value of process.memoryUsage().heapTotal');
      result.observe(process.memoryUsage().heapTotal);
    });

    // new context based on current, with key/values added to baggage
    const ctx: Context = propagation.setBaggage(
      context.active(),
      propagation.createBaggage({
        for_the_children: { value: 'another important value' },
      }),
    );
    // within the new context, do some "work"
    await context.with(ctx, async () => {
      await tracer.startActiveSpan('sleep', async (span: Span) => {
        console.log('saying hello to the world');
        span.setAttribute('message', 'hello-world');
        span.setAttribute('delay_ms', 100);
        await sleepy();
        console.log('sleeping a bit!');
        span.end();
      });
    });
    sayHello();
    res.end('Hello, World!\n');
  } catch (err) {
    next(err);
  }
});

function sleepy(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('awake now!');
    }, 100);
    resolve();
  });
}

app.listen(port, hostname, () => {
  console.log(`Now listening on: http://${hostname}:${port}/`);
});
