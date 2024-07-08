import {Atom} from "@atomrx/atom"
import {Lens} from "@atomrx/lens";
import {map, Observable} from "rxjs"
import type {ValidationResult, Validate} from "./types"
import {createValidationResult} from "./utils"
import {assertAndReturn} from "@atomrx/utils";

type ElementOfArray<T> = T extends readonly (infer Values)[] ? Values | undefined : never;

export class FormStore<T, WithUndefined = false> {
    readonly canSubmit$ = this.validationResult.pipe(map(it => it.status === "success"))
    private readonly bindCache: Map<keyof T | number, FormStore<any, any>> = new Map()

    constructor(
        readonly value: Atom<WithUndefined extends true ? T | undefined : T>,
        readonly validationResult: Observable<ValidationResult<T>>,
    ) {}

    bind(index: number): FormStore<ElementOfArray<T>, true>
    bind<K extends keyof NonNullable<T>>(field: K): FormStore<NonNullable<T>[K], T extends undefined | null ? true : WithUndefined>

    bind<K extends keyof T>(
        field: K | number,
    ): FormStore<NonNullable<T>[K], T extends undefined | null ? true : WithUndefined> | FormStore<ElementOfArray<T>, true>{
        const cached = this.bindCache.get(field)
        if (cached) return cached
        // @ts-ignore
        const created = new FormStore(this.value.lens(typeof field === 'number' ? Lens.index(field) : field), this.getChild(field))
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
