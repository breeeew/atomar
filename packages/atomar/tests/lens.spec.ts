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
})
