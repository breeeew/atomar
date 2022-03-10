import {useRx} from "./useRx";
import type {RxProps} from "./types"

export function Rx<T>(props: RxProps<T>) {
    const [value, {error, pending}] = useRx(props.value$)

    if (pending) {
        if (props.pending) {
            return props.pending()
        }
        return null
    }

    if (error) {
        return props.rejected?.(error) ?? <>{error.message}</>
    }

    return props.children(value as T)
}
