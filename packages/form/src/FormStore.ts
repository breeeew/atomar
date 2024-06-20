import {Atom} from "@atomrx/atom"
import {map, Observable} from "rxjs"
import type {ValidationResult, Validate} from "./types"
import {createValidationResult} from "./utils"
import {assertAndReturn} from "@atomrx/utils";

type ElementOfArray<T> = T extends readonly (infer Values)[] ? Values : never;

export class FormStore<T> {
    readonly canSubmit$ = this.validationResult.pipe(map(it => it.status === "success"))
    private readonly bindCache: Map<keyof T | number, FormStore<any>> = new Map()

    constructor(
        readonly value: Atom<T>,
        readonly validationResult: Observable<ValidationResult<T>>,
    ) {}

    bind(index: number): FormStore<ElementOfArray<T>>
    bind<K extends keyof T>(field: K): FormStore<T[K]>

    bind<K extends keyof T>(
        field: K | number,
    ): FormStore<T[K]> | FormStore<ElementOfArray<T>>{
        const cached = this.bindCache.get(field)
        if (cached) return cached
        // @ts-ignore
        const created = new FormStore(this.value.lens(field), this.getChild(field))
        this.bindCache.set(field, created)
        // @ts-ignore
        return created
    }

    private getChild<K extends keyof T>(field: K): Observable<ValidationResult<T[K]>> {
        return this.validationResult.pipe(
            map(x => {
                if (x.status === "validating") {
                    return { status: "validating" }
                }
                if (x.status === "error" && x.children?.[field]) {
                    return assertAndReturn(x.children[field]!)
                }
                return { status: "success" }
            })
        )
    }

    static create<K>(value: Atom<K>, validate: Validate<K>) {
        return new FormStore(value, createValidationResult(value, validate))
    }
}
