import {map} from "rxjs";
import {Atom} from "./atom";

describe('Atom', () => {
    it('Atom.create should return atom instance with initial values', (done) => {
        const atom$ = new Atom({test: 'value'})
        const subscribeMock = jest.fn()
        expect(typeof atom$.update === 'function').toBeTruthy()
        atom$.subscribe(subscribeMock)
        expect(subscribeMock).toBeCalledWith({test: 'value'})
        atom$.set({test: 'value1'})
        expect(subscribeMock).toBeCalledWith({test: 'value1'})
        expect(subscribeMock).toBeCalledTimes(2)
        done()
    })

    it('atom.update should update value by passed callback', (done) => {
        const atom$ = new Atom({test: 'value'})
        const subscribeMock = jest.fn()
        atom$.subscribe(subscribeMock)
        atom$.update(value => {
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
        expect(valueLensed$.getValue()).toBe(123)
        valueLensed$.set(333)
        expect(atom$.getValue()).toStrictEqual({test: {inner: {value: 333}}})
    })

    it('Atom is valid Observable', () => {
        const atom$ = Atom.create({test: {inner: {value: 123}}})
        const res$ = atom$.pipe(map(value => value.test.inner))
        const resSubscriptionMock = jest.fn()
        res$.subscribe(resSubscriptionMock)
        expect(resSubscriptionMock).toBeCalledWith({value: 123})
    })

    it('Atom.isAtom should check instance type', () => {
        const atom$ = Atom.create({test: 123})
        expect(Atom.isAtom(atom$)).toBeTruthy()
        const lens$ = atom$.lens('test')
        expect(Atom.isAtom(lens$)).toBeTruthy()
    })

    it('Should unsubscribe in correct way', () => {
        const atom$ = Atom.create({test: 123})
        const lensed$ = atom$.lens('test')
        lensed$.unsubscribe = jest.fn()
        const sub = lensed$.subscribe(jest.fn())
        sub.unsubscribe()
        expect(lensed$.unsubscribe).toBeCalledTimes(1)

        const atomSub = atom$.subscribe()
        atomSub.unsubscribe()
        expect(atomSub.closed).toBeTruthy()
    })
})
