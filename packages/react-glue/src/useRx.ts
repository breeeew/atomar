'use client'

import {MutableRefObject, useCallback, useMemo, useRef} from "react"
import {pendingWrapped, wrap} from "@atomrx/wrapped";
import {Wrapped, WrappedObservable} from "@atomrx/wrapped";
import {Observable} from "rxjs";
import {useSyncExternalStore} from "use-sync-external-store/shim";

function toObsWithSyncGetter<T>(
    observable: Observable<T>,
    next: MutableRefObject<VoidFunction>,
    value: MutableRefObject<Wrapped<T>>
) {
    let first = true
    const subscription = observable.pipe(wrap).subscribe(x => {
        if (value.current !== x) {
            value.current = x
            if (!first) next.current()
        }
        first = false
    })

    return {
        source: observable,
        unsubscribe: () => {
            next.current = () => {}
            subscription.unsubscribe()
        },
    };
}

export function useRx<T>(source: WrappedObservable<T>): Wrapped<T> {
    const next = useRef(() => {})
    const value = useRef<Wrapped<T>>(pendingWrapped)
    const wrapped = useMemo(() => toObsWithSyncGetter(source, next, value), [source])
    const get = useCallback(() => value.current, []);

    const subscribe = useCallback((_next: VoidFunction) => {
        next.current = _next
        return wrapped.unsubscribe
    }, [wrapped])

    return useSyncExternalStore(subscribe, get, get)
}
