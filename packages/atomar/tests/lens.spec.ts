import {Lens} from "@atomrx/lens";
import {Atom} from "@atomrx/atom";

type Data = {
    value: number
    data: string
    optional?: string
}

describe('Lens', () => {
    it('create', () => {
        const atom$ = Atom.create({value: 123, data: 'qwe'})
        const lens = Lens.create<Data, string>(v => String(v.value), (v, s) => ({...s, value: Number(v)}))
        const lensed$ = atom$.lens(lens)
        expect(atom$.get().value).toBe(123)
        expect(lensed$.get()).toBe('123')
        lensed$.set('345')
        expect(lensed$.get()).toBe('345')
        expect(atom$.get().value).toBe(345)
    })
    it('index', () => {
        const data: Data[] = [{value: 123, data: 'qwe'}, {value: 345, data: 'asd'}]
        const atom$ = Atom.create(data)
        const lens$ = atom$.lens(Lens.index(0)).lens('value')
        expect(lens$.get()).toBe(123)
        lens$.set(111)
        expect(lens$.get()).toBe(111)
        expect(atom$.get()).toEqual([{value: 111, data: 'qwe'}, {value: 345, data: 'asd'}])
    })
    it('index undefined', () => {
        const data: Data[] = [{value: 123, data: 'qwe'}]
        const atom$ = Atom.create(data)
        const lens$ = atom$.lens(Lens.index(1)).lens('value')
        const optional$ = atom$.lens(Lens.index(1)).lens('optional')
        expect(lens$.get()).toBe(undefined)
        lens$.set(111)
        expect(lens$.get()).toBe(undefined)
        optional$.set('optional')
        expect(optional$.get()).toBe(undefined)
        expect(atom$.get()).toBe(data)

        atom$.modify(v => [...v, {value: 345, data: 'asd'}])
        expect(atom$.get()).toEqual([{value: 123, data: 'qwe'}, {value: 345, data: 'asd'}])
        lens$.set(666)
        expect(atom$.get()).toEqual([{value: 123, data: 'qwe'}, {value: 666, data: 'asd'}])
        expect(lens$.get()).toBe(666)
        optional$.set('optional1')
        expect(atom$.get()).toEqual([{value: 123, data: 'qwe'}, {value: 666, data: 'asd', optional: 'optional1'}])
        optional$.set(undefined)
        expect(atom$.get()).toEqual([{value: 123, data: 'qwe'}, {value: 666, data: 'asd'}])
    })
    it('find', () => {
        const data: Data[] = [{value: 123, data: 'qwe'}, {value: 345, data: 'asd'}]
        const atom$ = Atom.create(data)
        const lens$ = atom$.lens(Lens.find(x => x.value === 345)).lens('data')
        expect(lens$.get()).toBe('asd')
        lens$.set('fff')
        expect(lens$.get()).toBe('fff')
        expect(atom$.get()).toEqual([{value: 123, data: 'qwe'}, {value: 345, data: 'fff'}])
    })

    it('find undefined', () => {
        const data: Data[] = [{value: 123, data: 'qwe'}, {value: 345, data: 'asd'}]
        const atom$ = Atom.create(data)
        const lens$ = atom$.lens(Lens.find(x => x.value === 999)).lens('data')
        expect(lens$.get()).toBe(undefined)
        lens$.set('fff')
        expect(lens$.get()).toBe(undefined)

        expect(atom$.get()).toEqual([{value: 123, data: 'qwe'}, {value: 345, data: 'asd'}])
        atom$.modify(x => [...x, {value: 999, data: 'zzz'}])

        expect(lens$.get()).toBe('zzz')
        lens$.set('xxx')
        expect(lens$.get()).toBe('xxx')
        expect(atom$.get()).toEqual([{value: 123, data: 'qwe'}, {value: 345, data: 'asd'}, {value: 999, data: 'xxx'}])
    })
    it('compose', () => {
        const data = {
            id: 1,
            name: 'data',
            values: [
                {value: 123},
            ],
        }
        const atom$ = Atom.create(data)
        const lens$ = atom$.lens('values').lens(Lens.compose(
            Lens.find(x => x.value === 111),
            Lens.withDefault({value: 111}),
        ))
        expect(lens$.get()).toEqual({value: 111})
        atom$.modify(v => ({
            ...v,
            values: [
                ...v.values,
                {value: 111},
            ],
        }))
        expect(lens$.get()).toEqual({value: 111})
        lens$.set({value: 333})
        expect(lens$.get()).toEqual({value: 111})
    })
    it('nested', () => {
        const data = {
            id: 1,
            name: 'data',
            values: [
                {value: 123, data: [{id: 1, nested: 'qwe'}]},
            ],
        }
        const atom$ = Atom.create(data)
        const lens$ = atom$.lens('values').lens(Lens.find(x => x.value === 1)).lens('data').lens(Lens.find(x => x.id === 2))
        expect(lens$.get()).toBeUndefined()
        lens$.modify(v => v ? ({...v, nested: 'asd'}) : v)
        expect(atom$.get()).toEqual(data)
    })
    it('nested set undefined', () => {
        const data = {
            id: 1,
            name: 'data',
            values: [
                {value: 123, data: [{id: 1, nested: 'qwe'}]},
            ],
        }
        const atom$ = Atom.create(data)
        const lens$ = atom$.lens('values').lens(Lens.find(x => x.value === 123))
        expect(lens$.get()).toEqual({value: 123, data: [{id: 1, nested: 'qwe'}]})
        atom$.modify(x => ({...x, values: []}))
        expect(lens$.get()).toBeUndefined()
        lens$.set({value: 321, data: []})
        expect(atom$.get()).toEqual({...data, values: []})
    })
    it('nested set undefined 2', () => {
        const data = {
            id: 1,
            name: 'data',
            values: {
                a: {b: 123},
            },
        }
        const atom$ = Atom.create(data)
        const lens$ = atom$.lens('values').lens('a').lens('b')
        expect(lens$.get()).toBe(123)
        atom$.modify(x => ({...x, values: undefined} as unknown as typeof data))
        expect(lens$.get()).toBeUndefined()
        lens$.set(321)
        expect(lens$.get()).toBeUndefined()
        expect(atom$.get()).toEqual({...data, values: undefined})
    })
})
