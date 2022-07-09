export function wait<T>(promise: Promise<T>, timeout: number) {
    let t: NodeJS.Timeout
    return Promise.race([
        promise.then(r => {
            clearTimeout(t)
            return r
        }),
        new Promise((_, rej) => t = setTimeout(rej, timeout)),
    ])
}
