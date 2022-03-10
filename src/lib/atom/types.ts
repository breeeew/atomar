import {Observer} from "rxjs";

export type SubscribeNextParam<T> = (value: T) => void
export type SubscribeObserverParam<T> = Partial<Observer<T>>
export type SubscribeErrorParam = ((error: any) => void) | null
export type SubscribeCompleteParam = (() => void) | null
export type SubscribeArgs<T> = [SubscribeNextParam<T>]
    | [SubscribeObserverParam<T>?]
    | [SubscribeNextParam<T>?, SubscribeErrorParam?, SubscribeCompleteParam?]
