import xs from 'xstream'
import {run} from '@cycle/run';
import {makeHTTPDriver} from '@cycle/http';
import {div, h1, makeDOMDriver, button, h4, a, tr, table, tbody, thead, td, li, ul, span, th, h} from '@cycle/dom';
import { makeHistoryDriver } from '@cycle/history';
import switchPath from 'switch-path';
import {routerify} from 'cyclic-router';

function Home(sources) {
  const vtree$ = xs.of(h('h1', {}, 'Hello I am Home'));
  return {
    DOM: vtree$
  };
}

function TodoList(sources) {
  let request$ = xs.of({
    url: 'http://127.0.0.1:3000/todos', // GET method by default
    category: 'todos',
  });
  let renderTodo = todo => tr([td(todo.due), td(todo.task), td(todo.status), td(a({ props: { href: '/todos/' + todo.id } }, 'Show'))])
  const todos$ = sources.HTTP.select('todos')
    .flatten()
    .map(res => res.body)
    .startWith([]);

  const vdom$ = todos$.map(todo =>
    h('table', {}, [
      h('thead', {}, h('tr', {}, [
        h('td', "due"),
        h('td', "task"),
        h('td', "status")
      ])),
      h('tbody',{}, todo.map(renderTodo))
      ])
    );

  return {
    DOM: vdom$,
    HTTP: request$
  };
}

function Todo({props$, sources}) {
  let request$ = xs.of({
    url: 'http://127.0.0.1:3000/todos/' + String(props$.id) + '.json', // GET method by default
    category: 'todo',
  });

  const todo$ = sources.HTTP.select('todo')
    .flatten()
    .map(res => res.body)
    .startWith(null);

  const vdom$ = todo$.map(todo =>
    div('.todos', [
      todo === null ? null : div('.todo-details', [
        h1('.todo-name', todo.due),
        h4('.todo-email', todo.task),
        h4('.todo-email', todo.status),
        a('.user-website', {attrs: {href: '/'}}, 'Back')
      ])
    ])
  );

  return {
    DOM: vdom$,
    HTTP: request$
  };
}

const routes = {
  '/': TodoList,
  '/other': TodoList,
  '/todos/:id': id => sources => Todo({props$: {id}, sources})
};

function main(sources) {
  const {router} = sources
  const match$ = router.define(routes)
  const page$ = match$.map(({path, value}) => {
    return value(Object.assign({}, sources, {
      router: sources.router.path(path)
    }));
  });

  const clickHref$ = sources.DOM.select('a').events('click');
  const history$ = clickHref$.map(ev => ev.target.pathname);
  const vtree$ = page$.map(c => c.DOM).flatten().map(childVnode => h('div#app', {}, [navbar(), childVnode]));
  const requests$ = page$.map(x => x.HTTP).filter(x => !!x).flatten();

  const sinks = {
    DOM: vtree$,
    router: history$,
    preventDefault: clickHref$,
    HTTP: requests$
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

const mainWithRouting = routerify(main, switchPath)

const drivers = {
  DOM: makeDOMDriver('#root'),
  history: makeHistoryDriver(),
  preventDefault: event$ => event$.subscribe({ next: e => e.preventDefault() }),
  HTTP: makeHTTPDriver()
};

run(mainWithRouting, drivers)
