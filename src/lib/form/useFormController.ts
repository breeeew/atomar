import {FormController} from "./FormController"
import {useEffect} from "react"

export function useFormController<T>(controller: FormController<T>) {
    useEffect(() => {
        return () => controller.destroy()
    }, [controller])

    return controller
}
