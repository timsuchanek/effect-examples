import { Effect, Layer } from "effect/io";
import { Context, pipe } from "effect/data";
import * as Chunk from "@fp-ts/data/Chunk";
import fetch from "node-fetch";

const myFetch = <T>(url: string) =>
  pipe(
    Effect.tryPromise(() => fetch(url)),
    Effect.flatMap((e) => Effect.tryPromise(() => e.json() as Promise<T>)),
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

  const arr = new Array(100).fill(undefined).map((i) => i + 1);

  const urls = arr.map((n) => `https://jsonplaceholder.typicode.com/todos/${n}`);

  type Todo = {
    userId: number;
    id: number;
    title: string;
    completed: boolean;
  };

  const ms = Date.now();
  const xy = yield* $(
    pipe(
      urls,
      Effect.forEachPar((url) => pipe(myFetch<Todo>(url), Effect.retryN(5))),
      Effect.map(Chunk.toReadonlyArray)
    )
  );

  const after = Date.now();
  console.log(((after - ms) / 1000) | 0);

  console.log(xy);

  // const x = yield* $(
  //   myFetch<Todo>(
  //     "https://jsonplaceholder.typicode.com/todos/1"
  //   )
  // );

  // if (x.userId === 1) {
  //   console.log("OMGGGG");
  // }

  // console.log("hier", x);
});

export const NameLive = Layer.fromEffect(Name)(
  Effect.sync(() => ({
    getName: Effect.succeed("Mike"),
  }))
);

pipe(
  program,
  Effect.provideLayer(NameLive),
  Effect.tapErrorCause(Effect.logErrorCause),
  Effect.unsafeFork
);
