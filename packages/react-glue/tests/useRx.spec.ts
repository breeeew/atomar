import {useRx} from '../src/useRx'
import {renderHook} from '@testing-library/react-hooks';
import {BehaviorSubject, Subject, tap} from "rxjs";
import {createFulfilledWrapped, pendingWrapped} from "@atomrx/wrapped";

describe('useRx hook', () => {
    it('should start with pending value for EMPTY observable', () => {
        const obs$ = new Subject();

        const view = renderHook((props) => useRx(props), {
            initialProps: obs$
        })

        expect(view.result.all.length).toBe(1);

        expect(view.result.current).toBe(pendingWrapped);

        view.unmount();
    })


    it('should render value when it comes', async () => {
        const obs$ = new Subject<number>();

        const view = renderHook((props) => useRx(props), {
            initialProps: obs$
        })

        expect(view.result.all.length).toBe(1);


        obs$.next(1);
        obs$.next(2);

        expect(view.result.all.length).toBe(3);

        expect(view.result.all).toEqual([pendingWrapped, createFulfilledWrapped(1), createFulfilledWrapped(2)]);

        view.unmount();
    })

    it('should not show pending value if data available synchronous', () => {
        const obs$ = new BehaviorSubject(1);

        const view = renderHook((props) => useRx(props), {
            initialProps: obs$
        })

        expect(view.result.all.length).toBe(1);

        expect(view.result.current).toEqual(createFulfilledWrapped(1));

        view.unmount();
    })

    it('should not show pending value after observable switch if new value available synchronous', () => {

        const obs1$ = new BehaviorSubject(1);
        const obs2$ = new BehaviorSubject(2);

        const view = renderHook((props) => useRx(props), {
            initialProps: obs1$
        })

        view.rerender(obs2$);

        expect(view.result.all.length).toBe(2);

        expect(view.result.all).toEqual([createFulfilledWrapped(1), createFulfilledWrapped(2)]);

        view.unmount();
    })

    it('should show pending value after observable switch if new value unavailable synchronous', () => {

        const obs1$ = new BehaviorSubject(1).asObservable()
        const obs2$ = new Subject<number>().asObservable();

        const view = renderHook((props) => useRx(props), {
            initialProps: obs1$
        })

        view.rerender(obs2$);


        expect(view.result.all.length).toBe(2);

        expect(view.result.all).toEqual([createFulfilledWrapped(1), pendingWrapped]);

        view.unmount();

    })

    it('should work normal when observables emits undefined as value', async () => {
        const obs$ = new Subject<void>();

        const view = renderHook((props) => useRx(props), {
            initialProps: obs$
        })

        expect(view.result.all.length).toBe(1);


        obs$.next();

        expect(view.result.all.length).toBe(2);

        expect(view.result.all).toEqual([pendingWrapped, createFulfilledWrapped(undefined)]);

        view.unmount();
    })

    it('should not introduce memory leaks with hanging subscriptions', () => {
        const sub1 = jest.fn();
        const sub2 = jest.fn();
        const sub3 = jest.fn();
        const unsub1 = jest.fn();
        const unsub2 = jest.fn();
        const unsub3 = jest.fn();

        const obs1$ = (new BehaviorSubject(1)).pipe(tap({
            subscribe: sub1,
            unsubscribe: unsub1
        }));
        const obs2$ = (new Subject<number>()).pipe(tap({
            subscribe: sub2,
            unsubscribe: unsub2
        }));
        const obs3$ = (new Subject<number>()).pipe(tap({
            subscribe: sub3,
            unsubscribe: unsub3
        }));

        const view = renderHook((props) => useRx(props), {
            initialProps: obs1$
        })

        expect(sub1).toHaveBeenCalledTimes(1);

        view.rerender(obs2$);
        expect(unsub1).toHaveBeenCalledTimes(1);
        expect(sub2).toHaveBeenCalledTimes(1);

        view.rerender(obs3$);
        expect(sub3).toHaveBeenCalledTimes(1);
        expect(unsub2).toHaveBeenCalledTimes(1);

        view.unmount();

        expect(unsub3).toHaveBeenCalledTimes(1);
    })
})