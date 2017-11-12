import {run} from '@cycle/rxjs-run'
import {VNode, makeDOMDriver, div, h2, button, pre, p, code} from '@cycle/dom'
import Rx from 'rxjs/Rx'
import xs from 'xstream';
import {makeHTTPDriver} from '@cycle/http'

function main({ DOM, HTTP}) {
  let request$ = xs.of({
    url: 'http://127.0.0.1:3000/todos',
    category: 'api',
  })
  const response$ = HTTP.select('api');
  const vtree$ = xs.of(
    div(
      '.container',
      [
        h2({response$})
      ]
    )
  )
  const sinks = {
    DOM: vtree$,
    HTTP: request$
  }
  return sinks
}

const drivers = {
  DOM: makeDOMDriver('body'),
  HTTP: makeHTTPDriver()
}

run(main, drivers);
