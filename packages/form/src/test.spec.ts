import Joi from "joi"
import {lastValueFrom, Observable, timer, filter, first, map, reduce, takeWhile} from "rxjs"
import {expectType, TypeEqual} from 'ts-expect'
import type { ValidationResult, ValidationResultError, ValidationStatus } from "./types"
import {Atom} from "@atomrx/atom";
import {validateJoi} from "./validation"
import {FormStore} from "./FormStore"

interface SignUpForm {
    firstName: string
    lastName: string
}

const firstNameSchema = Joi.string().required().min(2).max(100)

const schema = Joi.object().keys({
    firstName: firstNameSchema,
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
        expect.assertions(3)
        const atom = createSignUpAtom()
        const form = FormStore.create(atom, joiValidation)
        const firstNameValidation = form.bind("firstName").validationResult

        const withError = await lastValueFrom(firstNameValidation
            .pipe(
                filter((x): x is ValidationResultError<string> => x.status === "error"),
                first()
            ))
        

        expect(withError.error).toBe('"firstName" is not allowed to be empty')
        expect(withError.type).toBe('string.empty')

        atom.modify(it => ({
            ...it,
            firstName: "First Name",
        }))
        const success = await lastValueFrom(firstNameValidation
            .pipe(
                filter(x => x.status === "success"),
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
        expect(tillError[0]?.status).toBe("validating")
        expect(tillError[1]?.status).toBe("error")
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
        expect(tillError[0]?.status).toBe("success")
        expect(tillError[1]?.status).toBe("error")
    })

    it("if there is error, validation status should be emitted after corrected to valid state", async () => {
        expect.assertions(3)
        const atom = createSignUpAtom()
        const form = FormStore.create(atom, validateAsync)

        await collectTill(form.validationResult, "error")
        atom.lens("firstName").set("First name")
        atom.lens("lastName").set("Last name")

        const results = await collectTill(form.validationResult, "success")
        expect(results.length).toBe(2)
        expect(results[0]?.status).toBe("validating")
        expect(results[1]?.status).toBe("success")
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
        expect(results[0]?.status).toBe("validating")
        expect(results[1]?.status).toBe("error")
    })

    it("check right types after bind with possible nullable parent", () => {
        type User = {name: string};
        type Form = {userWithUndefined?: User, userWithNull: User | null};

        const atom = Atom.create<Form>({userWithUndefined: undefined, userWithNull: null});
        const form = FormStore.create(atom, validateJoi(Joi.object()));

        const nameValueOfUndefinedUser = form.bind('userWithUndefined').bind('name').value.get();
        const nameValueOfNullUser = form.bind('userWithNull').bind('name').value.get();

        expectType<TypeEqual<typeof nameValueOfUndefinedUser, string | undefined>>(true)
        expectType<TypeEqual<typeof nameValueOfNullUser, string | undefined>>(true)
    });

    describe('form with array', () => {
        type Contract = {
            serial: string;
            acts: Array<{amount: number;}>
        }

        type ContractsForm = {
            contracts: Array<Contract>
        }

        function createContractsAtom() {
            return Atom.create<ContractsForm>({
                contracts: [
                    {
                        serial: 'contract-serial',

                        acts: [
                            {amount: 0},
                        ]
                    }
                ]
            })
        }

        const contractsFormValidation = validateJoi<ContractsForm>(Joi.object<ContractsForm>().keys({
            contracts: Joi.array().items(Joi.object().keys({
                serial: Joi.string().required(),

                acts: Joi.array().items(Joi.object().keys({
                    amount: Joi.number().min(1),
                }))
            }))
        }));

        test('create FormStore with array and perform validation', async () => {
            const atom = createContractsAtom();
            const form = FormStore.create(atom, contractsFormValidation);

            const contract = form.bind('contracts').bind(0);

            const contractValue = contract.value.get();
            expectType<TypeEqual<Contract | undefined, typeof contractValue>>(true);

            const amount = contract
                .bind('acts')
                .bind(0)
                .bind('amount');

            const amountValue = amount.value.get();
            expectType<TypeEqual<number | undefined, typeof amountValue>>(true);

            const withError = await lastValueFrom(amount.validationResult
                .pipe(
                    filter((x): x is ValidationResultError<number> => x.status === "error"),
                    first()
                ));

            expect(withError.error).toBe('"contracts[0].acts[0].amount" must be greater than or equal to 1');

            amount.value.set(10);

            const success = await lastValueFrom(amount.validationResult
                .pipe(
                    filter(x => x.status === "success"),
                    first()
                ));

            expect(success.status).toBe("success")
        });

        test('bind by non-existent index', async () => {
            const atom = createContractsAtom();
            const form = FormStore.create(atom, contractsFormValidation);

            const contract = form.bind('contracts').bind(999);
            expect(contract.value.get()).toBeUndefined();

            const amount = contract.bind('acts').bind(999).bind('amount');
            expect(amount.value.get()).toBeUndefined();
        });
    })
})
