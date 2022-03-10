import {AnySchema} from "joi";

export type FormConfig<T> = {
    initialValues: T
    schema: AnySchema<T>
    validateOnChange?: boolean
}
