import {useRx} from "./useRx";
import type {RxProps} from "./types"

export function Rx<T>(props: RxProps<T>) {
    const data = useRx(props.value$)

    if (data.status === 'pending') {
        if (props.pending) return <>{props.pending()}</>
        return null
    }

    if (data.status === 'rejected') {
        return <>{props.rejected?.(data.error, data.reload) ?? data.error.message}</>
    }

    if (data.status === 'idle') {
        if (props.idle) return <>{props.idle()}</>
        return null
    }

    return <>{props.children(data.value)}</>
}
