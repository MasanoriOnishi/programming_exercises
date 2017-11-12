import {run} from '@cycle/rxjs-run'
import {makeDOMDriver} from '@cycle/dom'
import Rx from 'rxjs/Rx'

export function main (sources) {
  const vtree$ = Rx.Observable.of(
    '<div>My Awesome Cycle.js app</div>'
  )
  const sinks = {
    DOM: vtree$
  }
  return sinks
}
const drivers = {
  DOM: makeDOMDriver('#root')
}

run(main, drivers)
