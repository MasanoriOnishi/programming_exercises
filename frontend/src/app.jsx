import Rx from 'rxjs/Rx'

export function App (sources) {
  const vtree$ = Rx.Observable.of(
    <div>My Awesome Cycle.js app</div>
  )
  const sinks = {
    DOM: vtree$
  }
  return sinks
}
