'use client'

import type {ReactElement} from "react";
import {useRx} from "./useRx";
import type {RxProps} from "./types"

export function Rx<T>(props: RxProps<T>): ReactElement | null {
    const data = useRx(props.value$)

    if (data.status === 'pending') {
        if (props.pending) {
            const pending = props.pending()
            if (pending) return <>{pending}</>
        }
        return null
    }

    if (data.status === 'rejected') {
        if (props.raiseUnhandledErrors && !props.rejected) {
            throw data.error
        }
        const rejected = props.rejected?.(data.error, data.reload)
        return rejected ? <>{rejected}</> : <>{data.error.message}</>
    }

    if (data.status === 'idle') {
        if (props.idle) {
            const idle = props.idle()
            if (idle) return <>{idle}</>
        }
        return null
    }
    const children = props.children(data.value)
    return children ? <>{children}</> : null
}
