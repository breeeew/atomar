import React, {useMemo} from "react"
import "./App.css"
import {Rx} from "./lib"
import {Atom} from "./lib"
import {combineLatest, defer, repeatWhen} from "rxjs"
import {useFormController} from "./lib"
import {FormController} from "./lib"
import Joi from "joi"

class AppController {
    greetings$ = Atom.create("hello world!")
    counter$ = Atom.create(0)

    greetingsWithCounter$ = combineLatest([this.greetings$, this.counter$])

    form = new FormController<{input: string}>({
        initialValues: {input: ""},
        schema: Joi.object({
            input: Joi.string(),
        }),
    })

    deferStatus$ = Atom.create<{resolved: boolean, value: string | undefined}>({resolved: false, value: undefined})

    defer$ = defer(async () => {
        this.deferStatus$.set({resolved: false})
        await new Promise(res => setTimeout(res, 2000))
        this.deferStatus$.set({value: `resolved ${this.retryCount$.getValue()}`})
    }).pipe(repeatWhen(() => this.retryCount$))

    retryCount$ = Atom.create(0)

    text$ = this.form.value$.lens("input")

    updateCounter() {
        this.counter$.update(count => count + 1)
    }
}

function App() {
  const controller = useMemo(() => new AppController(), [])
  const form = useFormController(controller.form)

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
        <InputExample controller={controller} form={form}/>
        <hr/>
        <Rx
            value$={combineLatest([controller.defer$, controller.deferStatus$])}
            pending={() => (<div>is pending</div>)}
            children={([x, y]) => <div>{x}{y.value}</div>}
        />
        <Rx
            value$={controller.retryCount$}
            children={(retryCount) =>
                <button onClick={() => controller.retryCount$.update(count => count + 1)}>try again ({retryCount})</button>}
        />
    </div>
  )
}

function InputExample({controller, form}: {controller: AppController, form: FormController<{input: string}>}) {
    return (
        <Rx value$={controller.text$}>{(text) => (
            <div>
                <input
                    value={text}
                    onChange={e => form.value$.set({input: e.target.value})}
                />
                <Rx
                    value$={controller.form.validation$}
                    children={validation => (
                        <div>validation: {validation?.error?.message || "success"}</div>
                    )}
                />
                <button
                    onClick={() => {
                        form.handleSubmit(console.log)
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
