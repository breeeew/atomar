import type {ReactElement} from "react";
import type {WrappedObservable} from "../wrapped/types";

export type RxProps<T> = {
    value$: WrappedObservable<T>
    children(props: T): ReactElement
    rejected?(error: Error, reload?: () => void): ReactElement
    pending?(): ReactElement
    idle?(): ReactElement
}
