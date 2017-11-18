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
  '/': About,
  '/about': About,
  '/other': TodoList
};

function main(sources) {
  const clickHref$ = sources.DOM.select('a').events('click');
  const history$ = clickHref$.map(ev => ev.target.pathname);
  const history_data$ = sources.history
    .map(location => location.pathname)
    .map(pathname => routes[pathname])
    .map(Component => Component(sources))

  const vtree$ = history_data$.map(x => x.DOM).flatten().map(childVnode => h('div#app', {}, [navbar(), childVnode]));
  const requests$ = history_data$.map(x => x.HTTP).filter(x => !!x).flatten();
  console.log(requests$)

  const sinks = {
    DOM: vtree$,
    history: history$,
    preventDefault: clickHref$,
    debug: sources.history,
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

const drivers = {
  DOM: makeDOMDriver('#root'),
  history: makeHistoryDriver(),
  preventDefault: event$ => event$.subscribe({ next: e => e.preventDefault() }),
  debug: x$ => x$.subscribe({ next: console.error }),
  HTTP: makeHTTPDriver()
};

run(main, drivers)
