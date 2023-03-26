import {concat, from, Observable, of} from "rxjs"
import { mergeMap, scan, shareReplay } from "rxjs/operators"
import {Validate, ValidationResult, ValidationResultError, ValidationResultValidating} from "./types"

export function createValidationResult<T>(
    value: Observable<T>,
    validate: Validate<T>
): Observable<ValidationResult<T>> {
    const simplified = simplify(validate)
    return value.pipe(
        mergeMap(simplified),
        scan<ValidationResult<T>, ValidationResult<T>>(
            (prev, next) => {
                if (next.status === "validating" && prev.status === "error") {
                    return prev as ValidationResultError<T>
                }
                return next
            },
            {status: "validating"} as ValidationResultValidating
        ),
        shareReplay({
            refCount: true,
            bufferSize: 1,
        })
    )
}

function simplify<T>(validate: Validate<T>): (value: T) => Observable<ValidationResult<T>> {
    return value => {
        const vr = validate(value)
        if (vr instanceof Observable) {
            return vr
        } else if ("then" in vr) {
            return concat(of({status: "validating"} as ValidationResultValidating), from(vr))
        } else {
            return of(vr)
        }
    }
}
