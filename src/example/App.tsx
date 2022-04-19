import React, {useMemo} from "react"
import {Rx} from "../lib"
import {Atom} from "../lib"
import {combineLatest, defer, repeatWhen} from "rxjs"
import {FormStore, validateJoi} from "../lib"
import Joi from "joi"

class AppController {
    greetings$ = Atom.create("hello world!")
    counter$ = Atom.create(0)

    greetingsWithCounter$ = combineLatest([this.greetings$, this.counter$])

    validate = validateJoi(Joi.object({
        input: Joi.string(),
    }))

    form = FormStore.create<{input: string}>(Atom.create({input: ''}), this.validate)

    deferStatus$ = Atom.create<{resolved: boolean, value: string | undefined}>({resolved: false, value: undefined})

    defer$ = defer(async () => {
        this.deferStatus$.set({resolved: false, value: undefined})
        await new Promise(res => setTimeout(res, 2000))
        this.deferStatus$.set({resolved: true, value: `resolved ${this.retryCount$.get()}`})
    }).pipe(repeatWhen(() => this.retryCount$))

    retryCount$ = Atom.create(0)

    text$ = this.form.bind("input")

    updateCounter() {
        this.counter$.modify(count => count + 1)
    }
}

function App() {
  const controller = useMemo(() => new AppController(), [])

  return (
    <div className="App">
      <Rx value$={controller.greetingsWithCounter$}>
        {([value, counter]) => (
            <div>{value} {counter}</div>
        )}
      </Rx>
        <button
            type="button"
            onClick={() => controller.updateCounter()}
        >
            counter <Rx value$={controller.counter$}>{(count) => <>{count}</>}</Rx>
        </button>
        <hr/>
        <InputExample controller={controller}/>
        <hr/>
        <Rx
            value$={combineLatest([controller.defer$, controller.deferStatus$])}
            pending={() => (<div>is pending</div>)}
            children={([x, y]) => <div>{x}{y.value}</div>}
        />
        <Rx
            value$={controller.retryCount$}
            children={(retryCount) =>
                <button onClick={() => controller.retryCount$.modify(count => count + 1)}>try again ({retryCount})</button>}
        />
    </div>
  )
}

function InputExample({controller}: {controller: AppController}) {
    return (
        <Rx value$={controller.text$.value}>{(text) => (
            <div>
                <input
                    value={text}
                    onChange={e => controller.text$.value.set(e.target.value)}
                />
                <Rx
                    value$={controller.text$.validationResult}
                    children={validation => (
                        <div>validation: {validation.status === 'error' ? validation.error : "success"}</div>
                    )}
                />
                <button
                    onClick={() => {
                        console.log(controller.form.value.get())
                    }}
                >
                    submit
                </button>
            </div>
        )}
        </Rx>
    )
}

export default App
