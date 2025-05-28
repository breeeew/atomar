import {Atom} from "@atomrx/atom";
import {combineLatest, filter, skip, Subscription, take} from "rxjs";
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

    it.only('new test', () => {
        const subs = new Subscription();
        const spyRoot = jest.fn();
        const spyFirstLevel = jest.fn();
        const spySecondLevel = jest.fn();
        const spyThirdLevel = jest.fn();


        const rootAtom$ = Atom.create({
            firstLevel: {
                value: 1,
                name: 'unset',
                secondLevel: {
                    value: 2,
                    name: 'unset',
                    thirdLevel: {
                        value: 3,
                        name: 'unset',
                    }
                }
            }
        })

        const firstLevel$ = rootAtom$.lens('firstLevel');
        const secondLevel$ = rootAtom$.view((root) => root.firstLevel.secondLevel);
        const thirdLevel$ = rootAtom$.lens('firstLevel').lens('secondLevel').lens('thirdLevel');

        subs.add(firstLevel$.subscribe((level) => {
            if (level.name !== 'name ' + level.value) {
                firstLevel$.modify((prev) => {
                    return {
                        ...prev,
                        name: `name ${prev.value}`
                    }
                })
            }
        }));

        subs.add(secondLevel$.subscribe((level) => {
            if (level.name !== 'name ' + level.value) {
                firstLevel$.modify((prev) => {
                    return {
                        ...prev,
                        name: `name ${prev.value}`,
                        secondLevel: {
                            ...prev.secondLevel,
                            name: `name ${prev.secondLevel.value}`,
                        }
                    }
                })
            }
        }));

        subs.add(thirdLevel$.subscribe((level) => {
            if (level.name !== 'name ' + level.value) {
                thirdLevel$.modify((prev) => {
                    return {
                        ...prev,
                        name: `name ${prev.value}`
                    }
                })
            }
        }))


        subs.add(rootAtom$.subscribe(spyRoot));
        subs.add(firstLevel$.subscribe(spyFirstLevel));

        firstLevel$.modify((prev) => ({
            ...prev,
            value: prev.value + 1,
        }))

        subs.add(secondLevel$.subscribe(spySecondLevel));
        subs.add(thirdLevel$.subscribe(spyThirdLevel));

        expect(spyRoot.mock.calls).toEqual([
            [{
                firstLevel: {
                    value: 1,
                    name: 'name 1',
                    secondLevel: {
                        value: 2,
                        name: 'name 2',
                        thirdLevel: {
                            value: 3,
                            name: 'name 3',
                        }
                    }
                }
            }],
            [{
                firstLevel: {
                    value: 2,
                    name: 'name 2',
                    secondLevel: {
                        value: 2,
                        name: 'name 2',
                        thirdLevel: {
                            value: 3,
                            name: 'name 3',
                        }
                    }
                }
            }]
        ]);
        expect(spyFirstLevel.mock.calls).toEqual([
            [{
                value: 1,
                name: 'name 1',
                secondLevel: {
                    value: 2,
                    name: 'name 2',
                    thirdLevel: {
                        value: 3,
                        name: 'name 3',
                    }
                }
            }],
            [{
                value: 2,
                name: 'name 2',
                secondLevel: {
                    value: 2,
                    name: 'name 2',
                    thirdLevel: {
                        value: 3,
                        name: 'name 3',
                    }
                }
            }]
        ]);

        subs.unsubscribe();
    })

    it("should test atom batch mode", () => {
        const atom$ = Atom.create({
            value: 123
        })
        const callbackMock = jest.fn()
        const sub = new Subscription()
        sub.add(atom$.subscribe(callbackMock))
        callbackMock.mockReset()
        atom$.batch(() => {
            atom$.set({value: 345})
            expect(atom$.get()).toStrictEqual({value: 345})
            atom$.set({value: 346})
            expect(atom$.get()).toStrictEqual({value: 346})
            atom$.lens('value').set(347)
            expect(atom$.get()).toStrictEqual({value: 347})
            expect(atom$.lens('value').get()).toBe(347)
        })
        expect(callbackMock).toBeCalledTimes(1)
        expect(atom$.get()).toStrictEqual({value: 347})
    })

    it("should test atom batch mode with async fn", async () => {
        const atom$ = Atom.create({
            value: 123
        })
        const callbackMock = jest.fn()
        const sub = new Subscription()
        sub.add(atom$.subscribe(callbackMock))
        callbackMock.mockReset()
        const result = await atom$.batch(async () => {
            atom$.set({value: 345})
            expect(atom$.get()).toStrictEqual({value: 345})
            atom$.set({value: 346})
            expect(atom$.get()).toStrictEqual({value: 346})
            atom$.lens('value').set(347)
            expect(atom$.get()).toStrictEqual({value: 347})
            expect(atom$.lens('value').get()).toBe(347)
            return atom$.get()
        })
        expect(callbackMock).toBeCalledTimes(1)
        expect(atom$.get()).toStrictEqual({value: 347})
        expect(result).toStrictEqual({value: 347})
    })
})
