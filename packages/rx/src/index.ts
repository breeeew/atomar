import {combineLatest, isObservable, map, Observable, of} from "rxjs";
import {Lens} from "@atomrx/lens";
import {isKeyOf} from "@atomrx/utils";

export type Lifted<T> = {
    [K in keyof T]: Observable<T[K]> | T[K];
};

type InferObservableInTuple<T extends unknown[]> = {
    [I in keyof T]: T[I] extends Observable<infer T> ? T : T[I];
};
export function rxObject<T extends unknown[]>(lifted: [...T]): Observable<InferObservableInTuple<T>>;
export function rxObject<T>(lifted: Lifted<T>): Observable<T>;
export function rxObject(lifted: unknown[] | Lifted<unknown>): Observable<unknown> {
    const observables: Observable<unknown>[] = [];
    const lenses: Lens<unknown[] | Lifted<unknown>, unknown>[] = [];
    walk(lifted, (value, lens) => {
        if (isObservable(value)) {
            observables.push(value);
            lenses.push(lens);
        }
    });
    if (observables.length === 0) {
        return of(lifted);
    }
    return combineLatest(observables).pipe(
        map((values) => lenses.reduce((acc, l, idx) => l.set(values[idx], acc), lifted)),
    );
}

function walk<T extends object>(props: T, handler: (value: unknown, lens: Lens<T, unknown>) => void) {
    for (const key in props) {
        if (props.hasOwnProperty(key) && isKeyOf(key, props)) {
            handler(props[key], Lens.key(key) as Lens<T, unknown>);
        }
    }
}
