## Создание и использование

Сигнатура функции
```ts
Lens.create<Source, Value>(
	getter: (source: Source) => Value,
	setter: (value: Value, source: Source) => Source
): Lens<Source, Value>
```

Пример использования
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

## Работа с массивами
### Lens.index
```ts
Lens.index<Value[], Value>(at: number): Lens<Value[], Value>
```

Пример использования
```ts
const list$ = Atom.create(['foo', 'bar'])
const bar$ = list$.lens(Lens.index(1)))

bar$.get() // -> 'bar'
bar$.set('baz')
bar$.get() // -> 'baz'

list$.get() // -> ['foo', 'baz']
```

### Lens.find
```ts
Lens.find<Value[], Value>(
  predicate: (item: Value) => boolean
): Lens<Value[], Value>
```

Пример использования
```ts
const list$ = Atom.create([{id: 1, type: 'foo'}, {id: 2, type: 'bar'}])

const x$ = list$.lens(Lens.find(x => x.id === 2))

x$.get() // -> {id: 2, type: 'bar'}
x$.lens('type').set('baz')
x$.get() // -> {id: 2, type: 'baz'}

list$.get() // -> [{id: 1, type: 'foo'}, {id: 2, type: 'baz'}]
```