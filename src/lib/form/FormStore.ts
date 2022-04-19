import {Atom} from "../atom"
import {map, Observable} from "rxjs"
import type {ValidationResult, ValidationResultValidating, ValidationResultSuccess, Validate} from "./types"
import {createValidationResult} from "./utils";

export class FormStore<T> {
    canSubmit$: Observable<boolean>
    private readonly bindCache: Map<keyof T, FormStore<any>> = new Map()

    constructor(public readonly value: Atom<T>, public readonly validationResult: Observable<ValidationResult<T>>) {
        this.canSubmit$ = this.validationResult.pipe(map(it => it.status === "success"))
    }

    bind<K extends keyof T>(field: K): FormStore<T[K]> {
        const cached = this.bindCache.get(field)
        if (cached) {
            return cached
        }
        const created = new FormStore(this.value.lens(field), this.getChild(field))
        this.bindCache.set(field, created)
        return created
    }

    private getChild<K extends keyof T>(field: K) {
        return this.validationResult.pipe(
            map(x => {
                if (x.status === "validating") {
                    return { status: "validating" } as ValidationResultValidating
                }
                if (x.status === "error" && x.children?.[field]) {
                    return x.children[field] as ValidationResult<T[K]>
                }
                return { status: "success" } as ValidationResultSuccess
            })
        )
    }

    static create<K>(value: Atom<K>, validate: Validate<K>) {
        return new FormStore(value, createValidationResult(value, validate))
    }
}
