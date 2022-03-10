import {FormController} from "./FormController";
import Joi from "joi";

describe("FormController", () => {
    it("Should validate onChange", () => {
        const controller = new FormController({
            validateOnChange: true,
            schema: Joi.object({
                test: Joi.string(),
            }),
            initialValues: {
                test: "",
            },
        })

        expect(controller.isChanged()).toBeFalsy()
        controller.value$.set({test: "qwe"})
        expect(controller.isChanged()).toBeTruthy()
        expect(controller.validation$.getValue()?.error).toBeUndefined()
        controller.value$.set({test: null})
        expect(controller.validation$.getValue()?.error?.details[0].type).toBe("string.base")
        expect(controller.state$.getValue()).toStrictEqual({changed: true})
    })

    it("Should validate on submit", () => {
        const controller = new FormController({
            schema: Joi.object({
                test: Joi.string(),
            }),
            initialValues: {
                test: "",
            },
        })

        expect(controller.validation$.getValue()).toBeUndefined()
        controller.value$.set({test: null})
        expect(controller.validation$.getValue()).toBeUndefined()
        const submit = jest.fn()
        controller.handleSubmit(submit)
        expect(controller.validation$.getValue()?.error?.details[0].type).toBe("string.base")
        controller.value$.set({test: 'asd'})
        controller.handleSubmit(submit)
        expect(controller.validation$.getValue()?.error).toBeUndefined()
        expect(submit).toBeCalledWith({test: 'asd'})
    })
})
