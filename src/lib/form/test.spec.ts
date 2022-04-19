import Joi from "joi"
import { filter, first, map, reduce, takeWhile } from "rxjs/operators"
import {lastValueFrom, Observable, timer} from "rxjs"
import type { ValidationResult, ValidationResultError, ValidationResultSuccess, ValidationStatus } from "./types"
import {Atom} from "../atom";
import {validateJoi} from "./validation";
import {FormStore} from "./FormStore";

interface SignUpForm {
    firstName: string
    lastName: string
}

const schema = Joi.object().keys({
    firstName: Joi.string().required().min(2).max(100),
    lastName: Joi.string().required(),
})

function createSignUpAtom(firstName = "", lastName = "") {
    return Atom.create<SignUpForm>({
        firstName,
        lastName,
    })
}

function delay(timeout: number): Promise<number> {
    return new Promise(resolve => setTimeout(resolve, timeout))
}

function collectTill<T>(vr: Observable<ValidationResult<T>>, status: ValidationStatus) {
    return lastValueFrom(vr
        .pipe(
            takeWhile(x => x.status !== status, true),
            reduce<ValidationResult<T>, ValidationResult<T>[]>((xs, x) => [...xs, x], []),
            first()
        ))
}

const joiValidation = validateJoi<SignUpForm>(schema)

async function validateAsync(value: SignUpForm) {
    await delay(100)
    return joiValidation(value)
}

describe("FormStore", () => {
    it("create FormStore and perform validation", async () => {
        expect.assertions(2)
        const atom = createSignUpAtom()
        const form = FormStore.create(atom, joiValidation)
        const firstNameValidation = form.bind("firstName").validationResult

        const withError = await lastValueFrom(firstNameValidation
            .pipe(
                filter(x => x.status === "error"),
                map(x => x as ValidationResultError<string>),
                first()
            ))
        expect(withError.error).toBe('"firstName" is not allowed to be empty')

        atom.modify(it => ({
            ...it,
            firstName: "First Name",
        }))
        const success = await lastValueFrom(firstNameValidation
            .pipe(
                filter(x => x.status === "success"),
                map(x => x as ValidationResultSuccess),
                first()
            ))
        expect(success.status).toBe("success")
    })

    it("should display validating status while perform async validation", async () => {
        expect.assertions(3)
        const atom = createSignUpAtom()
        const form = FormStore.create(atom, validateAsync)

        const tillError = await collectTill(form.validationResult, "error")
        expect(tillError.length).toBe(2)
        expect(tillError[0].status).toBe("validating")
        expect(tillError[1].status).toBe("error")
    })

    it("should display validating status while perform async validation (with Observable)", async () => {
        const atom = createSignUpAtom()
        const validate = (form: SignUpForm): Observable<ValidationResult<SignUpForm>> => {
            return timer(0, 1000).pipe(
                map(x => {
                    if (x > 0) {
                        return {
                            status: "error",
                            error: "some value",
                            children: {},
                        }
                    } else {
                        return {
                            status: "success",
                        }
                    }
                })
            )
        }
        const form = FormStore.create(atom, validate)

        await collectTill(form.validationResult, "success")
        const tillError = await collectTill(form.validationResult, "error")
        expect(tillError.length).toBe(2)
        expect(tillError[0].status).toBe("success")
        expect(tillError[1].status).toBe("error")
    })

    it("if there is error, no validation status should be emitted", async () => {
        expect.assertions(4)
        const atom = createSignUpAtom()
        const form = FormStore.create(atom, validateAsync)

        await collectTill(form.validationResult, "error")
        atom.lens("firstName").set("First name")
        atom.lens("lastName").set("Last name")

        const results = await collectTill(form.validationResult, "success")
        expect(results.length).toBe(3)
        expect(results[0].status).toBe("error")
        expect(results[1].status).toBe("error")
        expect(results[2].status).toBe("success")
    })

    it("validating should be emitted after success", async () => {
        expect.assertions(3)
        const atom = createSignUpAtom("First name", "Last name")
        const form = FormStore.create(atom, validateAsync)
        await collectTill(form.validationResult, "success")
        atom.lens("firstName").set("")
        atom.lens("lastName").set("")

        const results = await collectTill(form.validationResult, "error")
        expect(results.length).toBe(2)
        expect(results[0].status).toBe("validating")
        expect(results[1].status).toBe("error")
    })
})
