import Cycle from "@cycle/core"
import {makeDOMDriver, hJSX} from "@cycle/dom"

function main(drivers) {
  return {
    DOM: drivers.DOM.select("input").events("click")
      .map(ev => ev.target.checked)
      .startWith(false)
      .map(
        toggled =>
          <div>
            <input type="checkbox" /> Toggle me
            <p>{toggled ? "ON" : "off"}</p>
          </div>
      )
  }
}

const drivers = {DOM: makeDOMDriver("body")}

Cycle.run(main, drivers)
