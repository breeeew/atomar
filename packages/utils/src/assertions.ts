export function assertDefined<T>(x: T | null | undefined): asserts x is T {
    if (x === null || x === undefined) {
        throw new Error("Expected value to be defined")
    }
}

export function assertAndReturn<T>(x: T | null | undefined): T {
    assertDefined(x)
    return x
}

export function isKeyOf<T extends object>(key: string | number | symbol, obj: T): key is keyof T {
    return key in obj;
}
