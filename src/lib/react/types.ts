import {Observable} from "rxjs"
import {ReactElement} from "react";

export type RxProps<T> = {
    value$: Observable<T>
    children(props: T): ReactElement
    rejected?(error: Error): ReactElement
    pending?(): ReactElement
}
