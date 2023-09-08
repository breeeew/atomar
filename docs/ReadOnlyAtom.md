Каждый [[Atom]] является имплементацией интерфейса [[ReadOnlyAtom]]:
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

ReadOnlyAtom также является [[RxJS]] [[Observable]]
```ts
readOnlyAtom$.subscribe(...) // подробный пример см в Atom
```
[[Atom#Atom.view]]