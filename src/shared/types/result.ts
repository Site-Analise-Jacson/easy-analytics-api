import { Either } from "effect";

export type Result<T, E = Error> = Either.Either<T, E>;
export type AsyncResult<T, E = Error> = Promise<Either.Either<T, E>>;

export const Result = Either;

export const success = Either.right;
export const failure = Either.left;

export const isSuccess = Either.isRight;
export const isFailure = Either.isLeft;

export const combine = Result.all;
