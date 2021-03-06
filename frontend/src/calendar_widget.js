import xs from 'xstream'
import {div, span, input, table, tr, th, td, makeDOMDriver} from '@cycle/dom';
import {Calendar} from 'calendar';
import {defaultsDeep, isNumber, isPlainObject, mapValues, toPlainObject} from 'lodash';
import isolate from '@cycle/isolate';

const calendar = new Calendar();
const now = new Date();

const defaultProps = {
  i18n: {
    days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  },
  year: now.getFullYear(),
  month: now.getMonth(),
  value: null
};

function intent(DOM) {
  return xs.merge(
    DOM.select('.prev').events('click').map(() => -1),
    DOM.select('.next').events('click').map(() => +1),
    DOM.select('.cal-date').events('click').map(x => mapValues(toPlainObject(x.target.dataset), Number))
  ).startWith(null)
}

function model(props$, intent$) {
  return xs.combine(props$, intent$)
    .map(([props, intent]) => {
      console.log(intent)
      if (isNumber(intent)) {
        props.month = props.month + intent;
        if (props.month < 0) {
          props.year--;
          props.month = 11;
        }
        if (props.month > 11) {
          props.year++;
          props.month = 0;
        }
      }
      if (isPlainObject(intent)) {
        if (intent.month === undefined) {
          intent.month = 0;
        }
        props.value = intent;
      }
      return props;
    });
}

function view(model$, visibility$) {
  return xs.combine(model$, visibility$)
  .debug(([props, visible]) => console.log(props))
  .debug(([props, visible]) => console.log(visible))
  .map(([props, visible]) => div('.cal-wg',
      [
        input('#cal-open.input-group-addon', {props: {type: 'button', value: '□'}}),
        visible ? table('.calendar-table', [
          tr([
            th(input('.prev', {props: {type: 'button', value: '<', colSpan:1}})),
            th('.center', {props: {colSpan:5}}, props.i18n.months[props.month].substring(0, 3)+' '+props.year),
            th(input('.next', {props: {type: 'button', value: '>', colSpan:1}}))
          ]),
          tr(props.i18n.days.map(x => th(x.substring(0, 2))))
        ]
        .concat(calendar.monthDates(props.year, props.month).map(
          w => tr(w.map(
            d => td(
              '#cal-close.cal-date'
                +(d.getMonth() != props.month ? ' .minor' : '')
                +(d.getDate() == now.getDate() && d.getMonth() == now.getMonth() && d.getFullYear() == now.getFullYear() ? ' .today' : '')
                +(isPlainObject(props.value) && d.getDate() === props.value.day && d.getMonth() === props.value.month && d.getFullYear() === props.value.year ? ' .selected' : ''),
              {
                style: {
                  cursor: 'pointer'
                },
                dataset: {
                  year: d.getFullYear(),
                  month: d.getMonth(),
                  day: d.getDate()
                }
              },
              d.getDate().toString()
            )
          ))
        ))
      ) : null]
    )
  );
}

function CalendarWidget({DOM, props$}) {
  if (!props$) {
    props$ = xs.of({});
  }
  const visibility$ = xs.merge(
      DOM.select('#cal-open').events('click').mapTo(true),
      DOM.select('#cal-close').events('click').mapTo(false)
    ).startWith(false)

  const initProps$ = xs.of(defaultProps)
  const intent$ = intent(DOM);
  const model$ = model(initProps$, intent$);
  const view$ = view(model$, visibility$);

  const value$ = intent$
    .filter(intent => isPlainObject(intent))
    .map(value => new Date(value.year, value.month, value.day))
    .map(value => value.toLocaleDateString())
    .startWith(null);

  return {
    DOM: view$,
    value$
  };
}

export default (sources) => isolate(CalendarWidget)(sources);
