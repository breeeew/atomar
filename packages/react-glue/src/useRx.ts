import {useCallback, useEffect, useMemo} from "react"
import {pendingWrapped, wrap} from "@atomrx/wrapped";
import {Wrapped, WrappedObservable} from "@atomrx/wrapped";
import {useSyncExternalStore} from 'use-sync-external-store/shim'
import {Observable, shareReplay, Subscription} from "rxjs";

function toObsWithSyncGetter<T>(observable: Observable<T>) {
    let value: T | undefined
    let next: ((value: T) => void) | undefined
    const subscription = observable.pipe(shareReplay({
        refCount: true,
        bufferSize: 1,
    })).subscribe(x => {
        value = x
        next?.(x)
    })

    return {
        source: observable,
        getValue: (fallback: T) => value ?? fallback,
        unsubscribe: () => {
            subscription.unsubscribe()
            next = undefined
        },
        attach: (nextFn: (value: T) => void) => {
            next = nextFn
        }
    };
}

export function useRx<T>(source: WrappedObservable<T>): Wrapped<T> {
    const wrapped = useMemo(() =>
        toObsWithSyncGetter(wrap(source)),
        [source],
    );
    const get = useCallback(() => wrapped.getValue(pendingWrapped), [wrapped]);

    const subscribe = useCallback(
        (next: VoidFunction) => {
            wrapped.attach(next);
            return () => wrapped.unsubscribe();
        },
        [wrapped]
    );

   return useSyncExternalStore(subscribe, get, get);
}
