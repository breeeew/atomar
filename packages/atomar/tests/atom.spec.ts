import {Atom} from "@atomrx/atom";
import {combineLatest, filter, Subscription} from "rxjs";
import {wait} from "./utils";

describe('Atom', () => {
    it('get/set', () => {
        const atom$ = Atom.create({value: 123})
        expect(atom$.get()).toEqual({value: 123})
        atom$.set({value: 321})
        expect(atom$.get()).toEqual({value: 321})
    })
    it('lens key', () => {
        const atom$ = Atom.create({value: 123, data: 345})
        const value$ = atom$.lens('value')
        const data$ = atom$.lens('data')

        expect(value$.get()).toBe(123)
        expect(data$.get()).toBe(345)

        value$.set(666)
        data$.set(777)
        expect(value$.get()).toBe(666)
        expect(data$.get()).toBe(777)
        expect(atom$.get()).toEqual({value: 666, data: 777})
    })
    it('view', () => {
        const atom$ = Atom.create({value: 123})
        const view$ = atom$.view('value')
        expect(view$.get()).toBe(123)
        atom$.set({value: 345})
        expect(view$.get()).toBe(345)
    })
    it('observable', async () => {
        const atom$ = Atom.create({value: 123})
        const callbackMock = jest.fn()
        const sub = new Subscription()

        const promise = new Promise(res => {
            atom$.subscribe(x => {
                callbackMock(x)
                if (callbackMock.mock.calls.length === 3) {
                    sub.unsubscribe()
                    res(undefined)
                }
            })
        })
        atom$.set({value: 345})
        atom$.set({value: 346})
        await wait(promise, 1000)
        expect(callbackMock).toBeCalledTimes(3)
        expect(callbackMock).toHaveBeenCalledWith({value: 123})
        expect(callbackMock).toHaveBeenCalledWith({value: 345})
        expect(callbackMock).toHaveBeenCalledWith({value: 346})
    })

    it("should handle issue with tail notification in case of loops", () => {
        const spyAfterEffect = jest.fn();
        const spyBeforeEffect = jest.fn();
        const subs = new Subscription();
        const atomA$ = Atom.create<number>(0);
        const atomB$ = Atom.create<number | undefined>(undefined);


        subs.add(atomB$.subscribe(spyBeforeEffect));

        subs.add(combineLatest([atomA$, atomB$])
            .pipe(
                filter(([a, b]) => {
                    return b === undefined;
                }),
            )
            .subscribe(([a]) => {
                atomB$.set(a);
                atomA$.modify((a) => ++a);
            })
        );

        subs.add(atomB$.subscribe(spyAfterEffect));

        atomB$.set(undefined);

        expect(spyBeforeEffect.mock.calls).toEqual([[undefined], [0], [undefined], [1]]);
        expect(spyAfterEffect.mock.calls).toEqual([[0], [1]]);

        subs.unsubscribe();
    });
})
