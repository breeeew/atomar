import {
    useMemo,
    Component,
    type FunctionComponent,
} from "react";
import React from "react";
import jsxRuntime from "react/jsx-runtime";
import jsxRuntimeDev from "react/jsx-dev-runtime";
import {useSyncExternalStore} from "use-sync-external-store/shim";
import {JsonAtom} from "@atomrx/atom/src/base";

export {Rx} from './Rx'
export {RxIf} from './RxIf'
export type {RxProps} from './types'

type JsxRuntimeModule = {
    jsx?(type: any, ...rest: any[]): unknown;
    jsxs?(type: any, ...rest: any[]): unknown;
    jsxDEV?(type: any, ...rest: any[]): unknown;
}

const ReactElemType = Symbol.for("react.element"); // https://github.com/facebook/react/blob/346c7d4c43a0717302d446da9e7423a8e28d8996/packages/shared/ReactSymbols.js#L15
const ReactMemoType = Symbol.for("react.memo"); // https://github.com/facebook/react/blob/346c7d4c43a0717302d446da9e7423a8e28d8996/packages/shared/ReactSymbols.js#L30
const ReactForwardRefType = Symbol.for("react.forward_ref"); // https://github.com/facebook/react/blob/346c7d4c43a0717302d446da9e7423a8e28d8996/packages/shared/ReactSymbols.js#L25
const ProxyInstance = new WeakMap<
    FunctionComponent<any>,
    FunctionComponent<any>
>();

const SupportsProxy = typeof Proxy === "function";

const ProxyHandlers = {
    apply(Component: FunctionComponent, thisArg: any, argumentsList: any) {
        const store = useMemo(() => createObservableStore(), []);
        useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
        // const stop = store.updater._start();

        try {
            const children = Component.apply(thisArg, argumentsList);
            return children;
        } catch (e) {
            // Re-throwing promises that'll be handled by suspense
            // or an actual error.
            throw e;
        } finally {
            // Stop effects in either case before return or throw,
            // Otherwise the effect will leak.
            stop();
        }
    },
};

function ProxyFunctionalComponent(Component: FunctionComponent<any>) {
    return ProxyInstance.get(Component) || WrapWithProxy(Component);
}
function WrapWithProxy(Component: FunctionComponent<any>) {
    if (SupportsProxy) {
        const ProxyComponent = new Proxy(Component, ProxyHandlers);

        ProxyInstance.set(Component, ProxyComponent);
        ProxyInstance.set(ProxyComponent, ProxyComponent);

        return ProxyComponent;
    }

    const WrappedComponent = function () {
        return ProxyHandlers.apply(Component, undefined, arguments);
    };
    ProxyInstance.set(Component, WrappedComponent);
    ProxyInstance.set(WrappedComponent, WrappedComponent);

    return WrappedComponent;
}

function createObservableStore() {
    // let updater!: unknown;
    let version = 0;
    let onChangeNotifyReact: (() => void) | undefined;

    // let unsubscribe = effect(function (this: Effect) {
    //     updater = this;
    // });
    // updater._callback = function () {
    //     version = (version + 1) | 0;
    //     if (onChangeNotifyReact) onChangeNotifyReact();
    // };

    return {
        // updater,
        subscribe(onStoreChange: () => void) {
            onChangeNotifyReact = onStoreChange;

            return function () {
                version = (version + 1) | 0;
                onChangeNotifyReact = undefined;
                // unsubscribe();
            };
        },
        getSnapshot() {
            return version;
        },
    };
}

function WrapJsx<T>(jsx: T): T {
    if (typeof jsx !== "function") return jsx;

    return function (type: any, props: any, ...rest: any[]) {
        if (typeof type === "function" && !(type instanceof Component)) {
            return jsx.call(jsx, ProxyFunctionalComponent(type), props, ...rest);
        }

        if (type && typeof type === "object") {
            if (type.$$typeof === ReactMemoType) {
                type.type = ProxyFunctionalComponent(type.type);
                return jsx.call(jsx, type, props, ...rest);
            } else if (type.$$typeof === ReactForwardRefType) {
                type.render = ProxyFunctionalComponent(type.render);
                return jsx.call(jsx, type, props, ...rest);
            }
        }

        if (typeof type === "string" && props) {
            for (let i in props) {
                let v = props[i];
                if (i !== "children" && v instanceof JsonAtom) {
                    props[i] = v.get();
                }
            }
        }

        return jsx.call(jsx, type, props, ...rest);
    } as any as T;
}

const JsxPro: JsxRuntimeModule = jsxRuntime;
const JsxDev: JsxRuntimeModule = jsxRuntimeDev;

React.createElement = WrapJsx(React.createElement);
JsxDev.jsx && /*   */ (JsxDev.jsx = WrapJsx(JsxDev.jsx));
JsxPro.jsx && /*   */ (JsxPro.jsx = WrapJsx(JsxPro.jsx));
JsxDev.jsxs && /*  */ (JsxDev.jsxs = WrapJsx(JsxDev.jsxs));
JsxPro.jsxs && /*  */ (JsxPro.jsxs = WrapJsx(JsxPro.jsxs));
JsxDev.jsxDEV && /**/ (JsxDev.jsxDEV = WrapJsx(JsxDev.jsxDEV));
JsxPro.jsxDEV && /**/ (JsxPro.jsxDEV = WrapJsx(JsxPro.jsxDEV));

function Text({ data }: { data: JsonAtom<string | number | null> }) {
    return React.createElement(React.Fragment, null, {children: data.get()});
}

Object.defineProperties(JsonAtom.prototype, {
    $$typeof: { configurable: true, value: ReactElemType },
    type: { configurable: true, value: ProxyFunctionalComponent(Text) },
    props: {
        configurable: true,
        get() {
            return { data: this };
        },
    },
    ref: { configurable: true, value: null },
});
