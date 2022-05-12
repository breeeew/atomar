import {RejectedWrapped, wrapped, symbol, FulfilledWrapped, Wrapped, WrappedObservable} from "./types";
import {Observable} from "rxjs";

export function createRejectedWrapped(error: any, reload?: () => void): RejectedWrapped {
    return {
        [wrapped]: symbol,
        reload,
        error,
        status: 'rejected',
    }
}

export function createFulfilledWrapped<T>(value: T): FulfilledWrapped<T> {
    return {
        [wrapped]: symbol,
        status: 'fulfilled',
        value,
    }
}

export const pendingWrapped = {
    [wrapped]: symbol,
    status: 'pending',
} as Wrapped<any>

export const idleWrapped = {
    [wrapped]: symbol,
    status: 'idle',
}

export function isWrapped(value: unknown): value is Wrapped<any> {
    if (typeof value === "object" && value !== null) {
        return (value as Wrapped<any>)[wrapped] === symbol
    }
    return false
}

export function wrap<T>(observable: WrappedObservable<T>): Observable<Wrapped<T>> {
    if (isWrappedObservable(observable)) {
        return observable
    }
    const result = new Observable<Wrapped<T>>(s => {
        let got = false
        const subscription = observable.subscribe(
            value => {
                got = true
                s.next(toWrapped(value))
            },
            error => {
                got = true
                s.next(createRejectedWrapped(error))
            },
            () => {
                got = true
                s.complete()
            }
        )
        if (!got) {
            s.next(pendingWrapped)
        }
        s.add(subscription)
    })
    return markWrappedObservable(result)
}

function isWrappedObservable(observable: Observable<unknown>): observable is Observable<Wrapped<any>> {
    return (observable as any)[wrapped] === symbol
}

function toWrapped<T>(value: T | Wrapped<T>): Wrapped<T> {
    if (isWrapped(value)) {
        return value
    }
    return createFulfilledWrapped(value)
}

function markWrappedObservable<T>(observable: Observable<Wrapped<T>>): Observable<Wrapped<T>> {
    ;(observable as any)[wrapped] = symbol
    return observable
}