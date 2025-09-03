import {Atom} from "@atomrx/atom";
import {combineLatest, filter, skip, Subscription, take} from "rxjs";
import {wait} from "./utils";
import {Lens} from "@atomrx/lens";

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

    it("test consistency of initial value on subscription for derived atoms", () => {
        const rootAtom$ = Atom.create({value: 123});
        const value$ = rootAtom$.lens('value');
        const roValue$ = rootAtom$.view('value');
        const combinedValue$ = Atom.combine(
            rootAtom$,
            Atom.create({name: 'foo'}).lens('name'),
            (root, name) => `${name}${root.value}`)

        const spyValue = jest.fn();
        const spyRoValue = jest.fn();
        const spyCombinedValue = jest.fn();

        const subs = new Subscription();

        rootAtom$.modify(data => ({...data, value: 345}));

        subs.add(value$.subscribe(spyValue));
        subs.add(roValue$.subscribe(spyRoValue));
        subs.add(combinedValue$.subscribe(spyCombinedValue));

        expect(value$.get()).toBe(345);
        expect(roValue$.get()).toBe(345);
        expect(combinedValue$.get()).toBe('foo345');

        expect(spyValue).toHaveBeenCalledTimes(1);
        expect(spyValue).toHaveBeenCalledWith(345);

        expect(spyRoValue).toHaveBeenCalledTimes(1);
        expect(spyRoValue).toHaveBeenCalledWith(345)

        expect(spyCombinedValue).toHaveBeenCalledTimes(1);
        expect(spyCombinedValue).toHaveBeenCalledWith('foo345');

        subs.unsubscribe();
    })

    it('should not have glitches (tail notifications) in case of derived atoms', () => {
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

    it('derived atoms should cache transformed value once for all subscribers', () => {
        const root$ = Atom.create({
            a: 1,
            b: 'foo',
            c: true
        });

        const spyViewTransform = jest.fn((data: { a: number }) => data.a);
        const spyLensTransform = jest.fn((data: { a: number, b: string, c: boolean }) => data.b);
        const spyCombineTransform = jest.fn((first: { c: boolean }, second: string) => first.c + second);

        const view$ = root$.view(spyViewTransform);
        const lensed$ = root$.lens(Lens.create(spyLensTransform, (b, rest) => ({
            ...rest,
            b,
        })));
        const combined$ = Atom.combine(root$, Atom.create('bar'), spyCombineTransform);

        const sub = new Subscription();

        sub.add(view$.subscribe());
        sub.add(view$.subscribe());
        sub.add(view$.subscribe());
        sub.add(view$.subscribe());
        sub.add(view$.subscribe());

        sub.add(lensed$.subscribe());
        sub.add(lensed$.subscribe());
        sub.add(lensed$.subscribe());
        sub.add(lensed$.subscribe());
        sub.add(lensed$.subscribe());

        sub.add(combined$.subscribe());
        sub.add(combined$.subscribe());
        sub.add(combined$.subscribe());
        sub.add(combined$.subscribe());
        sub.add(combined$.subscribe());

        root$.set({
            a: 2,
            b: 'baz',
            c: false
        });

        root$.set({
            a: 2,
            b: 'baz',
            c: false
        });

        expect(spyViewTransform).toHaveBeenCalledTimes(3);
        expect(spyLensTransform).toHaveBeenCalledTimes(3);
        expect(spyCombineTransform).toHaveBeenCalledTimes(3);

        sub.unsubscribe();
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
        expect(atom$.isBatching).toBe(false);

        sub.unsubscribe();
    })

    it("should test atom batch mode with success async fn", async () => {
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

        expect(atom$.isBatching).toBe(false);
    })

    it("should test atom batch mode with failed async fn", async () => {
        const atom$ = Atom.create({
            value: 123
        })
        const callbackMock = jest.fn()
        const sub = new Subscription()
        sub.add(atom$.subscribe(callbackMock))
        callbackMock.mockReset();
        try {
            await atom$.batch(async () => {
                atom$.modify(data => ({
                    ...data,
                    value: 456,
                }))
                return Promise.reject(new Error('error'));
            })
        } catch (err) {

        }
        expect(callbackMock).toBeCalledTimes(1)
        expect(atom$.get()).toStrictEqual({value: 456})

        expect(atom$.isBatching).toBe(false);
    })

    it("#get() should not return outdated value for derived atoms", async () => {
        const atom$ = Atom.create({
            value: 123
        })

        const view$ = atom$.view('value');

        const sub = new Subscription();
        const spy = jest.fn();

        sub.add(atom$.subscribe(() => {
            spy(view$.get());
        }));

        sub.add(view$.subscribe())

        atom$.modify((prev) => ({
            ...prev,
            value: 456
        }))

        expect(spy.mock.calls).toEqual([[123], [456]])


        sub.unsubscribe()
    })
})
