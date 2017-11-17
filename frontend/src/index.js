import xs from 'xstream'
import {run} from '@cycle/run';
import {makeHTTPDriver} from '@cycle/http';
import {div, h1, makeDOMDriver, button, h4, a, tr, table, tbody, thead, td, li, ul, span, th, h} from '@cycle/dom';
import { makeHistoryDriver } from '@cycle/history';

function Home(sources) {
  const vtree$ = xs.of(h('h1', {}, 'Hello I am Home'));
  return {
    DOM: vtree$
  };
}

function About(sources) {
  const vtree$ = xs.of(h('h1', {}, 'About I am Home'));
  return {
    DOM: vtree$
  };
}

function TodoList(sources) {
  let request$ = xs.of({
    url: 'http://127.0.0.1:3000/todos', // GET method by default
    category: 'todos',
  });

  let renderTodo = todo => tr([td(todo.due), td(todo.task), td(todo.status)])


  const todos$ = sources.HTTP.select('todos')
    .flatten()
    .map(res => res.body)
    .startWith([]);

  const vdom$ = todos$.map(todo =>
    table(".table", tbody(todo.map(renderTodo))
  ));

  return {
    DOM: vdom$,
    HTTP: request$
  };
}

const routes = {
  '/': Home,
  '/about': About,
  '/other': TodoList
};

function main(sources) {
  const clickHref$ = sources.DOM.select('a').events('click');
  const history$ = clickHref$.map(ev => ev.target.pathname);
  let request$ = xs.of({
    url: 'http://127.0.0.1:3000/todos', // GET method by default
    category: 'todos',
  });

  const vtree$ = sources.history
    .map(location => location.pathname)
    .map(pathname => routes[pathname])
    .map(Component => Component(sources))
    .map(sinks => sinks.DOM)
    .flatten()
    .map(childVnode => h('div#app', {}, [navbar(), childVnode]));

  const sinks = {
    DOM: vtree$,
    history: history$,
    preventDefault: clickHref$,
    debug: sources.history,
    HTTP: request$
  };
  return sinks;
}

function navbar() {
  return h('div.pure-menu.pure-menu-horizontal', {}, [
    h('ul.pure-menu-list', {}, [
      h('li.pure-menu-item', {}, [
        h('a.pure-menu-link', { props: { href: '/' } }, 'Home')
      ]),
      h('li.pure-menu-item', {}, [
        h('a.pure-menu-link', { props: { href: '/about' } }, 'About')
      ]),
      h('li.pure-menu-item', {}, [
        h('a.pure-menu-link', { props: { href: '/other' } }, 'TodoList')
      ])
    ])
  ]);
}


const drivers = {
  DOM: makeDOMDriver('#root'),
  history: makeHistoryDriver(),
  preventDefault: event$ => event$.subscribe({ next: e => e.preventDefault() }),
  debug: x$ => x$.subscribe({ next: console.error }),
  HTTP: makeHTTPDriver()
};


// const drivers = {
//   DOM: makeDOMDriver('#root'),
//   HTTP: makeHTTPDriver()
// }

run(main, drivers)
