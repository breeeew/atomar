[[Atom]] – простой контейнер для данных, который предоставляет методы для модификации.
Atom используется для реализации [[state manager]] и удовлетворяет устоявшейся практике [[SSOT|Single Source of Truth]].

Пример:
```ts
const atom$ = Atom.create({
  name: 'John Doe',
  age: 42,
})

atom$.get() // {name: 'John Doe', age: 42}

atom$.set({name: 'Steve Doe', age: 40})
atom$.get() // {name: 'Steve Doe', age: 40}

atom$.modify(current => ({
  ...current,
  age: 41,
}))
atom$.get() // {name: 'Steve Doe', age: 41}
```
Atom также является наследником [[RxJS]] [[Observable]], соответсвенно возможно подписаться на изменения с помощью метода `.subscribe`
```ts
const subscription = atom$.subscribe(value => {
  console.log(value) // будет выводить значение на каждый set/modify в atom$
})
```
А также можно использовать операторы [[RxJS]]
```ts
const subscription = atom$.pipe(
 map(value => ({...value, age: 666}))
).subscribe(value => {
  console.log(value) // будет выводить значение на каждый set/modify в atom$, при этом age всегда будет выводиться как 666
})
```

Подписка при `.set` и `.modify` сработает только при изменении данных. На каждый .set/.modify происходит глубокое сравнение новых данных с текущими.
```ts
const subscription = atom$.subscribe(value => {
  console.log(value)
})
atom$.set({name: 'John Doe'})
// log: {name: 'John Doe'}
atom$.set({name: 'John Doe'})
// *nothing*
```

## Atom.view и [[ReadOnlyAtom]]
Каждый Atom является имплементацией интерфейса [[ReadOnlyAtom]]:
```ts
type ReadOnlyAtom<T> = Observable<T> & {
  get(): T
}
```
Методы `set` и `modify` у такого Atom не доступны.
Чтобы получить ReadOnlyAtom можно воспользоваться методом `.view()`
```ts
const readOnlyAtom$ = atom$.view()
readOnlyAtom$.set(...) // -> ts error
```
### Atom.view()
С помощью метода `.view` можно получить [[ReadOnlyAtom]], который указывает на часть объекта исходного атома:
```ts
const source$ = Atom.create({
  name: 'john',
  info: {
    birthday: '14.02.1992',
    size: 'xl',
  },
})

const info$ = source$.view('info')
const size$ = info$.view('size') // or source$.view('info').view('size')
size$.get() // -> 'xl'

source$.modify(x => ({...x, info: {...x.info, size: 'm'}}))
size$.get() // -> 'm'
info$.get() // -> {birthday: '14.02.1992', size: 'm'}
```

> Все изменения в исходном атоме вызывают `next()` у [[Observer]] в текущем потоке синхронно, поэтому в `.view().get()` всегда консистентные данные с `source$`

В качестве аргумента можно передать функцию:
```ts
const source$ = Atom.create({
  name: 'john',
  info: {
    birthday: '14.02.1992',
    size: 'xl',
  },
})

const size$ = source$.view(x => x.info.size)
size$.get() // -> 'xl'
```

## Atom.lens()

[[Lens]] или [[Lens|линза]] – удобный способ читать и писать в atom, точнее в его отдельные части, при этом имея возможность преобразовать данные. Это похоже на то как при помощи `map` из `RxJS` мы преобразуем данные в потоке, только с помощью `Lens` это можно делать и для записи в исходник.

Проще всего показать на примерах:
```ts
type Size = 'xl' | 'm' | 's'

type UserInfo = {
  birthday: string
  size: Size
}

type UserWithInfo = {
  name: string
  info: UserInfo
}

const sizeLens = Lens.create<UserWithInfo, Size>(
  source => source.info.size, // getter
  (value, source) => { // setter
    return {
      ...source,
      info: {
        ...source.info,
        size: value,
      },
    }
  },
)

const source$ = Atom.create({
  name: 'john',
  info: {
    birthday: '14.02.1992',
    size: 'xl',
  },
})

const size$ = source$.lens(sizeLens)

size$.get() // -> 'xl'

size$.set('s')

size$.get() // -> 's'

source$.get() // info.size will be 's' too
```

Atom.lens порождает новый Atom – это значит что в примере выше `size$` тоже является полноценным экземпляром Atom и на него дальше тоже можно применять lens.

Иными словами пример выше можно переписать вот так:
```ts
const infoLens = Lens.create<UserWithInfo, UserInfo>(
  source => source.info,
  (value, source) => ({...source, info: value})
)

const sizeLens = Lens.create<UserInfo, Size>(
  source => source.size, // getter
  (value, source) => ({...source, size: value}) // setter
)

const size$ = source$.lens(infoLens).lens(sizeLens)
```

Есть упрощённая форма записи lens для доступа по ключам:
```ts
const source$ = Atom.create({
  name: 'john',
  info: {
    birthday: '14.02.1992',
    size: 'xl',
  },
})

const size$ = source$.lens('info').lens('size')
```

