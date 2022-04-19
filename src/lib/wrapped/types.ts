import type {Observable} from "rxjs";

export type Wrapped<T> = PendingWrapped | RejectedWrapped | FulfilledWrapped<T>

export const wrapped = '__wrapped__'
export const symbol = Symbol.for(wrapped)

export type WrappedFlag = {
    [wrapped]: typeof symbol
}

export type PendingWrapped = {
    status: 'pending'
} & WrappedFlag

export type RejectedWrapped = {
    status: 'rejected'
    error: any
    reload?: () => void
} & WrappedFlag

export type FulfilledWrapped<T> = {
    status: 'fulfilled'
    value: T
} & WrappedFlag

export type WrappedObservable<T> = Observable<T | Wrapped<T>>
