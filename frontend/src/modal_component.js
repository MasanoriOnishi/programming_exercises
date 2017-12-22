import xs from 'xstream'
import {div} from '@cycle/dom';
import isolate from '@cycle/isolate';

function render([visible, content]) {
  return div('.modal', {
    class: {
      'modal--visible': visible
    }
  }, [
    div('.modal__content', [visible ? content : null])
  ]);
}

export function ModalComponent({props}) {
  const vdom$ = xs
    .combine(props.visibility$.startWith(false), props.content$)
    .map((x) => render(x));

  return {
    DOM: vdom$
  };
}

export default (sources) => isolate(ModalComponent)(sources);
