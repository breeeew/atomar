import {useEffect, useMemo, useState} from "react"
import {pendingWrapped, wrap} from "@atomrx/wrapped";
import {Wrapped, WrappedObservable} from "@atomrx/wrapped";

export function useRx<T>(observable: WrappedObservable<T>): Wrapped<T> {
    const [value, setValue] = useState<Wrapped<T>>(pendingWrapped);
    const memoized = useMemo(() => wrap(observable), [observable]);
    useEffect(() => {
        const sub = memoized.subscribe(setValue);
        return () => sub.unsubscribe();
    }, [memoized]);
    return value;
}
