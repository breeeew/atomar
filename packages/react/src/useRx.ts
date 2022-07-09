import {useEffect, useMemo, useRef, useState} from "react"
import {pendingWrapped, wrap} from "@atomrx/wrapped";
import {Wrapped, WrappedObservable} from "@atomrx/wrapped";

export function useRx<T>(observable: WrappedObservable<T>, deps: any[] = [observable]): Wrapped<T> {
    const [, setCount] = useState<number>(0)
    const value = useRef<Wrapped<T>>(pendingWrapped)
    const initial = useRef(true)
    const memoized = useMemo(() => wrap(observable), [observable])

    const sub = useMemo(
        () =>
            memoized.subscribe(next => {
                const current = value.current
                value.current = next
                if (!initial.current) {
                    if (
                        current.status !== next.status ||
                        (current.status === "fulfilled" && next.status === "fulfilled" && current.value !== next.value)
                    ) {
                        setCount(c => c + 1)
                    }
                }
            }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        deps
    )
    useEffect(() => () => sub.unsubscribe(), [sub])
    initial.current = false
    return value.current
}
