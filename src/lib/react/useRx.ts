import {catchError, Observable, of, shareReplay} from "rxjs"
import {useEffect, useState} from "react"
import {Atom} from "../atom/atom"

function getInitialValue<T>(atom: Atom<T>): T {
    return atom.getValue()
}

export function useRx<T>(value$: Observable<T>): [T | undefined, {error: Error | undefined, pending: boolean}] {
    const [pending, setPending] = useState(true)
    const [value, setValue] = useState<T | undefined>(Atom.isAtom(value$) ? getInitialValue(value$) : undefined)
    const [error, setError] = useState<Error | undefined>(undefined)

    useEffect(() => {
        setPending(true)
        const subscription = value$.pipe(catchError(err => {
            setError(err)
            setPending(false)
            return of(undefined)
        }), shareReplay(1)).subscribe(val => {
            setValue(val)
            setPending(false)
        })
        return () => {
            subscription.unsubscribe()
        }
    }, [value$])

    return [value, {error, pending}]
}
