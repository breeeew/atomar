import {equals as structEq} from "./structEq"
export {equals as structEq} from "./structEq"
import {Lens} from '@atomrx/lens';
import {combineLatest, isObservable, map, of, type Observable} from 'rxjs';

export function setKey<T, K extends keyof T>(k: K, v: T[K], o: T): T {
    if (k in o && structEq(v, o[k])) {
        return o
    } else {
        // this is the fastest way to do it, see
        // https://jsperf.com/focal-setkey-for-loop-vs-object-assign
        const r: { [k in keyof T]: T[k] } = {} as any
        for (const p in o) r[p] = o[p]
        r[k] = v

        return r
    }
}

/**
 * 'Conserve' a value's identity if its structure doesn't change.
 */
function conserve<T>(x: T, y: T): T {
    return structEq(x, y) ? y : x
}

/**
 * Make a fold function's behaviour conservative in its input value's
 * identity.
 */
export function conservatively<T, U>(fn: ((y: T, c0: U) => U)) {
    return (y: T, c0: U) => conserve(fn(y, c0), c0)
}

export function findIndex<T>(xs: T[], p: (x: T) => boolean): number {
    for (let i = 0; i < xs.length; i++) {
        if (p(xs[i])) return i
    }
    return -1
}

export function warning(message: string) {
    if (typeof console !== 'undefined' && typeof console.error === 'function') {
        console.error('[Atom]: ' + message)
    }

    // Throw a dummy error so it's possible to enter debugger with
    // 'break on all exceptions'.
    try {
        throw new Error(message)
    } catch (_) {
        /* no-op */
    }
}

export function isKeyOf<T extends object>(key: string | number | symbol, obj: T): key is keyof T {
    return key in obj;
}

export type Option<T> = T | undefined

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
