import {useRef, useCallback, useMemo, MutableRefObject} from "react"
import {pendingWrapped, wrap} from "@atomrx/wrapped";
import {Wrapped, WrappedObservable} from "@atomrx/wrapped";
import {useSyncExternalStore} from 'use-sync-external-store/shim'
import {Observable, shareReplay, skip, take} from "rxjs";

function toObsWithSyncGetter<T>(observable: Observable<T>) {
    return {
        source: observable,
        getValue: () => {
            let value: T | undefined
            const sub = observable.pipe(take(1)).subscribe(x => {
                value = x
            })
            sub.unsubscribe()
            return value
        }
    };
}

function useRefFn<T>(fn: () => T) {
    const ref = useRef<T>()
    if (!ref.current) {
        ref.current = fn()
    }
    return ref as MutableRefObject<T>
}

type RefValue<T> = {
    source: Observable<Wrapped<T>>
    value: Wrapped<T>
}

export function useRx<T>(source: WrappedObservable<T>): Wrapped<T> {
    const wrapped = useMemo(() => toObsWithSyncGetter(wrap(source).pipe(
        shareReplay({
            refCount: true,
            bufferSize: 1
        })),
    ), [source])

    const ref = useRefFn<RefValue<T>>(() => ({
        source: wrapped.source,
        value: wrapped.getValue() ?? pendingWrapped
    }))

    if (ref.current.source !== wrapped.source) {
        ref.current = {
            value: wrapped.getValue() ?? pendingWrapped,
            source: wrapped.source
        }
    }

    const get = useCallback(() => ref.current.value, []);

    const subscribe = useCallback(
        (next: VoidFunction) => {
            const subscription = wrapped.source.subscribe({
                next: (value) => {
                    if (value.status === 'fulfilled' && ref.current.value.status === 'fulfilled') {
                        if (ref.current.value.value !== value.value) {
                            ref.current.value = value;
                            next();
                        }
                    } else {
                        if (ref.current.value !== value) {
                            ref.current.value = value;
                            next();
                        }
                    }
                }
            });

            return () => subscription.unsubscribe();
        },

        [wrapped]
    );

   return useSyncExternalStore(subscribe, get, get);
}
