import type {ReactNode} from "react";
import type {WrappedObservable} from "@atomrx/wrapped";

export type RxProps<T> = {
    value$: WrappedObservable<T>
    children(props: T): ReactNode
    rejected?(error: Error, reload?: () => void): ReactNode
    pending?(): ReactNode
    idle?(): ReactNode
    raiseUnhandledErrors?: boolean
}
