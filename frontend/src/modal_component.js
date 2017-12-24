import xs from 'xstream'
import {div} from '@cycle/dom';
import isolate from '@cycle/isolate';

function render([visible, content]) {
  return div('.modalWin', {
    class: {
      'modalWin--visible': visible
    }
  }, [
    div('.modalWin__content', [visible ? content : null])
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
