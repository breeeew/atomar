import {map} from "rxjs"
import {Atom} from "./"
import {Lens} from "../lens"

describe('Atom', () => {
    it('Atom.create should return atom instance with initial values', (done) => {
        const atom$ = Atom.create({test: 'value'})
        const subscribeMock = jest.fn()
        expect(typeof atom$.modify === 'function').toBeTruthy()
        atom$.subscribe(subscribeMock)
        expect(subscribeMock).toBeCalledWith({test: 'value'})
        atom$.set({test: 'value1'})
        expect(subscribeMock).toBeCalledWith({test: 'value1'})
        expect(subscribeMock).toBeCalledTimes(2)
        done()
    })

    it('atom.update should update value by passed callback', (done) => {
        const atom$ = Atom.create({test: 'value'})
        const subscribeMock = jest.fn()
        atom$.subscribe(subscribeMock)
        atom$.modify(value => {
            expect(value).toStrictEqual({test: 'value'})
            return {test: 'value2'}
        })
        expect(subscribeMock).toBeCalledWith({test: 'value2'})
        expect(subscribeMock).toBeCalledTimes(2)
        done()
    })

    it('atom.lens should return new atom with lensed value', () => {
        const atom$ = Atom.create({test: 'value', test2: 'value2', test3: {value: 'nested value 1'}})
        const subscribeMock = jest.fn()
        atom$.subscribe(subscribeMock)

        const lensed$ = atom$.lens('test2')
        const lensSubscribeMock = jest.fn()
        lensed$.subscribe(lensSubscribeMock)

        expect(subscribeMock).toBeCalledWith({test: 'value', test2: 'value2', test3: {value: 'nested value 1'}})
        expect(lensSubscribeMock).toBeCalledWith('value2')

        lensed$.set('value3')
        expect(subscribeMock).toBeCalledWith({test: 'value', test2: 'value3', test3: {value: 'nested value 1'}})
        expect(lensSubscribeMock).toBeCalledWith('value3')

        const nestedLens$ = atom$.lens('test3')
        const nestedLensSubscribeMock = jest.fn()
        nestedLens$.subscribe(nestedLensSubscribeMock)
        expect(nestedLensSubscribeMock).toBeCalledWith({value: 'nested value 1'})
        nestedLens$.set({value: 'nested value 2'})
        expect(nestedLensSubscribeMock).toBeCalledWith({value: 'nested value 2'})
        expect(subscribeMock).toBeCalledWith({test: 'value', test2: 'value3', test3: {value: 'nested value 2'}})
    })

    it('atom.lens.set should update source atom too', () => {
        const atom$ = Atom.create({test: {inner: {value: 123}}})
        const lensed$ = atom$.lens('test')
        const innerLensed$ = lensed$.lens('inner')
        const valueLensed$ = innerLensed$.lens('value')
        expect(valueLensed$.get()).toBe(123)
        valueLensed$.set(333)
        expect(atom$.get()).toStrictEqual({test: {inner: {value: 333}}})
    })

    it('Atom is valid Observable', () => {
        const atom$ = Atom.create({test: {inner: {value: 123}}})
        const res$ = atom$.pipe(map(value => value.test.inner))
        const resSubscriptionMock = jest.fn()
        res$.subscribe(resSubscriptionMock)
        expect(resSubscriptionMock).toBeCalledWith({value: 123})
    })

    it('Should lens by Lens object', () => {
        type Value = {
            test: number
            inner: {
                value: string
                deep: {
                    deepValue: string
                    deepInt: number
                }
            }
        }
        const testLens = Lens.create((value: Value) => value.test, (value: number, current) => ({
            ...current,
            test: value,
        }))

        const atom$ = Atom.create<Value>({
            test: 0,
            inner: {
                value: 'value',
                deep: {
                    deepValue: 'qwe',
                    deepInt: 123,
                },
            },
        })

        const lensed$ = atom$.lens(testLens)
        expect(lensed$.get()).toEqual(0)
        lensed$.set(1)
        expect(lensed$.get()).toEqual(1)
        expect(atom$.get().test).toEqual(1)

        const innerLens = Lens.create((value: Value) => value.inner.value, (value: string, current) => ({
            ...current,
            inner: {
                ...current.inner,
                value,
            },
        }))

        const innerLensed$ = atom$.lens(innerLens)
        expect(innerLensed$.get()).toEqual("value")
        innerLensed$.set('changed')
        expect(innerLensed$.get()).toEqual("changed")
        expect(atom$.get()).toEqual({
            test: 1,
            inner: {
                value: 'changed',
                deep: {
                    deepValue: 'qwe',
                    deepInt: 123,
                },
            },
        })

        const deepLens = Lens.create(
            (value: Value) => value.inner.deep,
            (value: Value["inner"]["deep"], current) => ({
            ...current,
            inner: {
                ...current.inner,
                deep: value,
            },
        }))
        const deepLensed$ = atom$.lens(deepLens)
        expect(deepLensed$.get()).toEqual({
            deepValue: 'qwe',
            deepInt: 123,
        })

        deepLensed$.set({deepInt: 111, deepValue: 'asd'})
        expect(deepLensed$.get()).toEqual({deepInt: 111, deepValue: 'asd'})
    })
})
