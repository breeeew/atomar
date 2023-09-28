Компонента `Rx` предназначенна для обработки различных состояний асинхронного потока данных. Вот несколько примеров использования этой компоненты:

Пример 1: Ожидание данных и отображение заглушки

```jsx
import { Rx } from './RxComponent';

function MyComponent() {
  const fetchData$ = // ваш Observable для получения данных

  return (
    <Rx value$={fetchData$} pending={() => <p>Loading...</p>}>
      {(data) => (
        <div>
          <h1>Data:</h1>
          <p>{data}</p>
        </div>
      )}
    </Rx>
  );
}
```

В этом примере, компонента `Rx` будет отображать "Loading..." во время ожидания данных, а затем отображать полученные данные внутри `<div>`.

Пример 2: Обработка ошибок

```jsx
import { Rx } from './RxComponent';

function MyComponent() {
  const fetchData$ = // ваш Observable для получения данных

  return (
    <Rx value$={fetchData$} raiseUnhandledErrors>
      {(data) => (
        <div>
          {data ? (
            <p>Data: {data}</p>
          ) : (
            <p>An error occurred.</p>
          )}
        </div>
      )}
    </Rx>
  );
}
```

В этом примере, компонента `Rx` будет обрабатывать ошибку, выбрасывая её, если `raiseUnhandledErrors` установлен в `true`. В противном случае, ошибка будет отображена как "An error occurred."

Пример 3: Обработка состояния "idle"

```jsx
import { Rx } from './RxComponent';

function MyComponent() {
  const fetchData$ = // ваш Observable для получения данных

  return (
    <Rx value$={fetchData$} idle={() => <p>Idle state</p>}>
      {(data) => (
        <div>
          {data ? (
            <p>Data: {data}</p>
          ) : null}
        </div>
      )}
    </Rx>
  );
}
```

В этом примере, компонента `Rx` будет отображать "Idle state" в случае, если состояние данных "idle", иначе она просто не будет отображать ничего.