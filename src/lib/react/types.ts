import type {Observable} from "rxjs"
import type {ReactElement} from "react";
import type {Wrapped} from "../wrapped/types";

export type RxProps<T> = {
    value$: Observable<T | Wrapped<T>>
    children(props: T): ReactElement
    rejected?(error: Error, reload?: () => void): ReactElement
    pending?(): ReactElement
    idle?(): ReactElement
}
