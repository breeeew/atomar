'use client'

import type {ReactElement, ReactNode} from "react"
import type { Observable } from "rxjs"
import { useRx } from "./useRx"

type ReactChild = ReactElement | string | number
type OrReactChild<T> = ReactChild | ReactChild[] | T

export interface RxIfProps {
    test$: Observable<unknown>
    else?: OrReactChild<() => ReactNode>
    negate?: boolean
    children: OrReactChild<() => ReactNode>
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
        if (typeof children === "function") return <>{children()}</>
        else return <>{children}</>
    } else {
        if (typeof not === "function") return <>{not()}</>
        else return <>{not}</>
    }
}
