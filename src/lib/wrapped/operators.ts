import type {WrappedObservable} from "./types";
import type {Observable} from "rxjs";
import {wrap} from "./base";
import {mergeMap, NEVER, of, throwError} from "rxjs";

type F<T, R> = (value: T) => R

export function unwrap<T>(): F<WrappedObservable<T>, Observable<T>> {
    return observable =>
        wrap(observable).pipe(
            mergeMap(v => {
                switch (v.status) {
                    case "fulfilled":
                        return of(v.value)
                    case "pending":
                        return NEVER
                    case "rejected":
                        return throwError(v.error)
                    default:
                        return NEVER
                }
            })
        )
}
