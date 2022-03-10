import type {FormConfig} from "./types"
import {Atom} from "../atom/atom"
import {Subscription} from "rxjs"
import {ValidationResult} from "joi"
import isEqual from "lodash/isEqual"

export class FormController<T> {
    readonly value$: Atom<T>
    readonly validation$ = Atom.create<ValidationResult<T> | undefined>(undefined)
    readonly state$ = Atom.create({
        changed: false,
    })
    private subscription: Subscription | undefined

    constructor(private readonly config: FormConfig<T>) {
        this.value$ = Atom.create(config.initialValues)

        this.subscription = this.value$.subscribe(() => {
            if (this.isChanged()) {
                if (this.config.validateOnChange) {
                    this.validate()
                } else {
                    this.clearValidation()
                }
                this.state$.set({changed: true})
            }
        })
    }

    destroy() {
        this.subscription?.unsubscribe()
    }

    validate() {
        this.validation$.set(this.config.schema.validate(this.value$.getValue()))
    }

    clearValidation() {
        this.validation$.set(undefined)
    }

    handleSubmit(submit: (value: T) => any) {
        const value = this.value$.getValue()
        this.clearValidation()
        this.validate()
        const validation = this.validation$.getValue()

        if (!validation?.error) {
            return submit(value)
        }
    }

    isChanged() {
        return !isEqual(this.value$.getValue(), this.config.initialValues)
    }
}
