'use client'

import type {ReadOnlyAtom} from "@atomrx/atom";
import {useEffect, useState} from "react";

export function useAtom<TValue>(atom$: ReadOnlyAtom<TValue>) {
    const [state, setState] = useState(() => atom$.get());
    useEffect(() => {
        const sub = atom$.subscribe((x) => setState(x));
        return () => sub.unsubscribe();
    }, [atom$]);
    return state;
}
