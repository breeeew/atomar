import React from "react"
import { Observable } from "rxjs"
import { useRx } from "./useRx"
type OrReactChild<T> = React.ReactChild | React.ReactChild[] | T

export interface RxIfProps {
    test$: Observable<any>
    else?: OrReactChild<() => React.ReactNode>
    negate?: boolean
    children: OrReactChild<() => React.ReactNode>
}

export function RxIf({ test$, children, negate, else: not }: RxIfProps): React.ReactElement | null {
    const raw = useRx(test$)
    const truthy = raw.status === "fulfilled" && Boolean(raw.value)

    if (negate && !truthy) {
        if (typeof children === "function") return <>{children()}</>
        else return <>{children}</>
    } else if (negate) {
        if (typeof not === "function") return <>{not()}</>
        else return <>{not}</>
    } else if (truthy) {
        return <>{children}</>
    } else {
        if (typeof not === "function") return <>{not()}</>
        else return <>{not}</>
    }
}
