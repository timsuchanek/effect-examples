import { Effect, Layer, Hub } from "effect/io";
import { Context, Duration, pipe } from "effect/data";
import * as Chunk from "@fp-ts/data/Chunk";
import fetch from "node-fetch";

const myFetch = <T>(url: string) =>
  pipe(
    Effect.tryPromise(() => fetch(url)),
    Effect.flatMap((e) => Effect.tryPromise(() => e.json() as Promise<T>)),
    // Effect.tap((log) => Effect.log(`url: ${url}`)),
    Effect.mapError((e) => new FetchError(e))
  );

export const objectToString = (error: any): string => {
  const stack = typeof process !== "undefined" && process.env.CL_DEBUG ? error.stack : undefined;
  const str = error.toString();
  const stackStr = stack ? `\n${stack}` : "";
  if (str !== "[object Object]") return str + stackStr;

  try {
    return JSON.stringify({ ...error, stack }, null, 2);
  } catch (e: any) {
    console.log(error);

    return "Error while printing error: " + e;
  }
};

export const errorToString = objectToString;

class FetchError {
  readonly _tag = "FetchError";
  constructor(readonly originalError: any) {}
  toString() {
    return `${this._tag} – ${objectToString(this.originalError)}`;
  }
}

export interface Name {
  getName: Effect.Effect<never, never, string>;
}

export const Name: Context.Tag<Name> = Context.Tag<Name>();

export const program = Effect.gen(function* ($) {
  const { getName } = yield* $(Effect.service(Name));

  yield* $(Effect.log(`Hello ${yield* $(getName)}`));

  const arr = new Array(100).fill(undefined).map((lol, i) => i + 1);

  const urls = arr.map((n) => `https://jsonplaceholder.typicode.com/todos/${n}`);

  type Todo = {
    userId: number;
    id: number;
    title: string;
    completed: boolean;
  };

  const hub = yield* $(Hub.unbounded<Todo>());

  const consume = Effect.gen(function* ($) {
    const queue = yield* $(hub.subscribe());

    while (true) {
      const item = yield* $(queue.take());
      console.log(item);
    }
  });

  const produce = pipe(
    urls,
    Effect.forEachPar((url) =>
      pipe(
        myFetch<Todo>(url),
        Effect.retryN(5),
        Effect.tap((result) => Hub.publish(result)(hub)),
        Effect.cached(Duration.days(1))
      )
    ),
    Effect.withParallelism(5)
  );

  yield* $(Effect.tuplePar(consume, produce));

  console.log("noise");
  console.log("noise");
  console.log("noise");
  console.log("noise");
  console.log("noise");
  console.log("noise");
  console.log("noise");
  console.log("noise");
  console.log("noise");
  console.log("noise");
  console.log("noise");
  console.log("noise");
  console.log("noise");
  console.log("noise");

  yield* $(Effect.tuplePar(consume, produce));

  // yield* $(pipe(
  //   hub,
  //   Hub.subscribe()
  // ))
});

export const NameLive = Layer.fromEffect(Name)(
  Effect.sync(() => ({
    getName: Effect.succeed("Mike"),
  }))
);

pipe(
  program,
  Effect.scoped,
  Effect.provideLayer(NameLive),
  Effect.tapErrorCause(Effect.logErrorCause),
  Effect.unsafeFork
);
