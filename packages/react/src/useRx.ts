import {useRef, useCallback} from "react"
import {pendingWrapped, wrap} from "@atomrx/wrapped";
import {Wrapped, WrappedObservable} from "@atomrx/wrapped";
import {useSyncExternalStore} from 'use-sync-external-store/shim'

export function useRx<T>(source: WrappedObservable<T>): Wrapped<T> {
    const ref = useRef({
        source,
        value: pendingWrapped
    });
    if (ref.current.source !== source) {
        ref.current = {
            source,
            value: pendingWrapped
        };
    }

    const get = useCallback(() => ref.current.value, []);
    const subscribe = useCallback(
        (next) => {
            const subscription = wrap(source).subscribe({
                next: (value) => {
                    ref.current.value = value;
                    next();
                }
            });

            return () => subscription.unsubscribe();
        },
        [source]
    );

    return useSyncExternalStore(subscribe, get);
}
