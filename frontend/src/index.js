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
  let renderTodo = todo => tr([td(todo.due), td(todo.task), td(todo.status), td(a({ props: { href: '/about' } }, 'Show'))])
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

function About(sources) {
  const getRandomUser$ = sources.DOM.select('.get-random').events('click')
    .map(() => {
      const randomNum = Math.round(Math.random() * 9) + 1;
      return {
        url: 'https://jsonplaceholder.typicode.com/users/' + String(randomNum),
        category: 'user',
        method: 'GET'
      };
    });

  const user$ = sources.HTTP.select('user')
    .flatten()
    .map(res => res.body)
    .startWith(null);

  const vdom$ = user$.map(user =>
    div('.users', [
      button('.get-random', 'Get random user'),
      user === null ? null : div('.user-details', [
        h1('.user-name', user.name),
        h4('.user-email', user.email),
        a('.user-website', {attrs: {href: user.website}}, user.website)
      ])
    ])
  );

  return {
    DOM: vdom$,
    HTTP: getRandomUser$
  };
}

const routes = {
  '/': TodoList,
  '/about': About,
  '/other': TodoList
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
