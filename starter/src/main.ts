import { Effect, Layer } from "effect/io";
import { Context, pipe } from "effect/data";

export interface Name {
  getName: Effect.Effect<never, never, string>;
}

export const Name: Context.Tag<Name> = Context.Tag<Name>();

export const program = Effect.gen(function* ($) {
  const { getName } = yield* $(Effect.service(Name));

  yield* $(Effect.log(`Hello ${yield* $(getName)}`));
  yield* $(Effect.fail("Error"));
});

const program2 = pipe(
  Effect.log("hello"),
  Effect.flatMap((_) => Effect.succeed("world")),
  Effect.flatMap((previousResult) => Effect.fail(previousResult + " error"))
);

export const NameLive = Layer.fromEffect(Name)(
  Effect.sync(() => ({
    getName: Effect.succeed("Mike"),
  }))
);

pipe(
  program2,
  // Effect.provideLayer(NameLive),
  Effect.tapErrorCause(Effect.logErrorCause),
  Effect.unsafeFork
);
