import {useRef, useCallback, useMemo, useEffect} from "react"
import {pendingWrapped, wrap} from "@atomrx/wrapped";
import {Wrapped, WrappedObservable} from "@atomrx/wrapped";
import {useSyncExternalStore} from 'use-sync-external-store/shim'
import {Observable, shareReplay, Subscription} from "rxjs";

function toObsWithSyncGetter<T>(observable: Observable<T>) {
    let nextValue: T | undefined;

    return {
        source: new Observable<T>((s) => {
            const subscription = observable.subscribe({
                next: (value) => {
                    nextValue = value;
                    s.next(value);
                },
                complete: () => {
                    s.complete();
                }
            });
            s.add(subscription);
        }),
        getValue: () => nextValue
    };
}

type Ref<T> = {
    stored: ReturnType<typeof toObsWithSyncGetter<T>>
    value: T
    sub: Subscription | undefined
}

export function useRx<T>(source: WrappedObservable<T>): Wrapped<T> {
    const wrappedSource = useMemo(
        () =>
            toObsWithSyncGetter(
                wrap(source).pipe(
                    shareReplay({
                        refCount: true,
                        bufferSize: 1
                    })
                )
            ),
        [source]
    );
    const ref = useRef<Ref<Wrapped<T>>>({
        stored: wrappedSource,
        value: pendingWrapped,
        sub: undefined
    });


    if (ref.current.stored !== wrappedSource) {
        if (ref.current.sub) {
            ref.current.sub.unsubscribe();
            ref.current.sub = undefined;
        }
        ref.current = {
            stored: wrappedSource,
            value: wrappedSource.getValue() || pendingWrapped,
            sub: ref.current.sub
        };
    }

    if (!ref.current.sub) {
        ref.current.sub = ref.current.stored.source.subscribe();
        ref.current.value = ref.current.stored.getValue() || pendingWrapped;
    }

    const get = useCallback(() => ref.current.value, []);
    const subscribe = useCallback(
        (next) => {
            const subscription = wrappedSource.source.subscribe({
                next: (value) => {
                    if (ref.current.value !== value) {
                        ref.current.value = value;
                        next();
                    }
                }
            });

            return () => subscription.unsubscribe();
        },

        [wrappedSource]
    );

    useEffect(() => {
        return () => {
            if (ref.current.sub) {
                ref.current.sub.unsubscribe()
            }
        }
    }, [])

    return useSyncExternalStore(subscribe, get);
}
