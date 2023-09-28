## Создание и использование

Сигнатура функции
```ts
Lens.create<TSource, TValue>(
	getter: (source: TSource) => TValue,
	setter: (value: TValue, source: TSource) => TSource
): Lens<TSource, TValue>
```

Пример использования
> Далее во всех примерах будут использоваться эти данные
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

### Lens.key
Применяется для доступа по ключу объекта
```ts
Lens.key<Source, Key extends keyof Source>(
  key: keyof Source,
): Lens<Source, Source[Key]>
```

Пример использования
```ts
const infoLens = Lens.key<UserWithInfo, UserInfo>('info')
const info$ = source$.lens(infoLens)

info$.get() // {birthday: '...', size: '...'}
```

### Lens.index
Применяется для доступа по индексу массива
```ts
Lens.index<TValue[], TValue>(at: number): Lens<TValue[], TValue>
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
Применяется для доступа к элементу массива по предикату (аналог Array.prototype.find)
```ts
Lens.find<TValue[], TValue>(
  predicate: (item: TValue) => boolean
): Lens<TValue[], TValue>
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

### Lens.withDefault
Применяется когда нужно заменить undefined на значение по-умолчанию.
```ts
Lens.withDefault<TValue>(defaultValue: TValue): Lens<TValue | undefined, TValue>
```

Пример использование
```ts
const source$ = Atom.create<{value: string} | undefined>(undefined)
const value$ source$.lens(Lens.withDefault({value: 'foo bar'})).lens('value')
value$.get() // -> foo bar
source$.get() // -> undefined
value$.set('baz baz')
source$.get() // {value: 'baz baz'}
```
> ВАЖНО! если сделать применить `.set` с `defaultValue` обратно в линзу, то исходное значение будет восстановлено и будет `undefined`
```ts
const source$ = Atom.create<{value: string} | undefined>(undefined)
const value$ source$.lens(Lens.withDefault({value: 'foo bar'}))
value$.get() // -> {value: 'foo bar'}
source$.get() // -> undefined
value$.set({value: 'baz baz'})
source$.get() // -> {value: 'baz baz'}

// .set с defaultValue восстановит исходное значение в source
value$.set({value: 'foo bar'})
source$.get() // -> undefined
```