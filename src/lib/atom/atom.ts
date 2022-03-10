import {BehaviorSubject, Subscription} from "rxjs"
import {SubscribeArgs, SubscribeNextParam, SubscribeObserverParam} from "./types";

export class Atom<T> extends BehaviorSubject<T> {
    static create<T>(initialValue: T): Atom<T> {
        return new Atom(initialValue)
    }

    static isAtom(atom: unknown): atom is Atom<any> {
        return atom instanceof Atom || atom instanceof LensedAtom
    }

    set(value: Partial<T>) {
        if (typeof value === 'object') {
            this.next({...this.getValue(), ...value})
        } else {
            this.next(value)
        }
    }

    update(updateFunction: (value: T) => T) {
        this.next(updateFunction(this.getValue()))
    }
    //
    // lens<K extends keyof T, K1 extends keyof T[K]>(key: K, key1: K1): LensedAtom<T[K], K1>
    // lens<
    //     K extends keyof T,
    //     K1 extends keyof T[K],
    //     K2 extends keyof T[K][K1]
    //     >(key: K, key1: K1, key2: K1): LensedAtom<T[K][K1], K2>
    // lens<
    //     K extends keyof T,
    //     K1 extends keyof T[K],
    //     K2 extends keyof T[K][K1],
    //     K3 extends keyof T[K][K1][K2]
    //     >(key: K, key1: K1, key2: K1, key3: K3): LensedAtom<T[K][K1][K2], K3>

    lens<K extends keyof T>(key: K): LensedAtom<T, K> {
        return new LensedAtom<T, K>(key, this)
    }

}

export class LensedAtom<T, K extends keyof T> extends Atom<T[K]> {
    private readonly sourceSubscription: Subscription
    constructor(
        private readonly key: K,
        private readonly source$: Atom<T>,
    ) {
        super(source$.getValue()[key])
        this.sourceSubscription = this.source$.subscribe(value => {
            this.next(value[key])
        })
    }

    set(value: T[K]): void {
        this.source$.set({
            ...this.source$.getValue(),
            [this.key]: value,
        })
    }

    update(updater: (value: T[K]) => T[K]): void {
        const currentValue = this.source$.getValue()
        this.source$.next({
            ...currentValue,
            [this.key]: updater(currentValue[this.key]),
        })
    }

    unsubscribe() {
        this.sourceSubscription.unsubscribe()
        super.unsubscribe()
    }

    subscribe(next: SubscribeNextParam<T[K]>): Subscription
    subscribe(observer?: SubscribeObserverParam<T[K]>): Subscription
    subscribe(next?: SubscribeNextParam<T[K]>, error?: ((error: any) => void) | null, complete?: (() => void) | null): Subscription
    subscribe(...args: SubscribeArgs<T[K]>): Subscription {
        const sub = new Subscription(() => {
            this.unsubscribe()
        })
        sub.add(super.subscribe(...args as any))
        return sub
    }
}
