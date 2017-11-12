import {run} from '@cycle/rxjs-run'
import {VNode, makeDOMDriver, div, h2, button, pre, p, code} from '@cycle/dom'
// import {makeDOMDriver} from '@cycle/dom'
import Rx from 'rxjs/Rx'
import xs from 'xstream';
import {makeHTTPDriver} from '@cycle/http'
// import {DOMSource} from '@cycle/dom/rxjs-typings'
// import {HTTPSource} from '@cycle/http/rxjs-typings'

// DOM ツリーを作成
// function render(PageState) {
//   return div('.container-fluid', [
//     // render view ...
//   ]);
// }

export function main (sources) {
  // const defaultPageState = {
  //   response: {}
  // };
  const request$ = xs.periodic(1000)
    .mapTo({
      url: 'https://jsonplaceholder.typicode.com/posts',
      category: 'api',
    });

  const vtree$ = sources.HTTP.select('api').take(2).map(res => div(res))

  // let request$ = xs.of({
  //   url: 'http://localhost:3000/todos', // GET method by default
  //   category: 'api'
  // });
  //
  // let response$ = sources.HTTP.select('api').switchMap(x => x)

  // const vtree$ = Rx.Observable.of(
  //   '<div>My Awesome Cycle.js app</div>' + response$
  // )

  // 4. レスポンス Observable から値を取り出して DOM 構造を更新する
  // const pageState$ = response$.map(response => ({response})).startWith(defaultPageState);
  // const dom$ = pageState$.map(pageState => render(pageState$));

  const sinks = {
    DOM: vtree$,
    HTTP: request$
  }
  return sinks
}
const drivers = {
  DOM: makeDOMDriver('#root'),
  HTTP: makeHTTPDriver()
}

run(main, drivers)
