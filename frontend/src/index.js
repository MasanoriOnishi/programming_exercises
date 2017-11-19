import xs from 'xstream'
import {run} from '@cycle/run';
import {makeHTTPDriver} from '@cycle/http';
import {div, h1, makeDOMDriver, button, h4, a, tr, table, tbody, thead, td, li, ul, span, th, h} from '@cycle/dom';
import { makeHistoryDriver } from '@cycle/history';
import switchPath from 'switch-path';
import {routerify} from 'cyclic-router';
import sampleCombine from 'xstream/extra/sampleCombine'

function Home(sources) {
  const vtree$ = xs.of(h('h1', {}, 'Hello I am Home'));
  return {
    DOM: vtree$
  };
}

function TodoForm({DOM, HTTP}) {

  const defaultPageState = {
    response: {}
  };
  // DOM からの入力イベントを取得する
  const eventClickPost$ = DOM.select('#post').events('click');
  const eventInputPostDue$ = DOM.select('#post-due').events('input');
  const eventInputPostTask$ = DOM.select('#post-task').events('input');
  const eventInputPostStatus$ = DOM.select('#post-status').events('input');

  const request$ = xs.from(eventClickPost$).compose(sampleCombine(
    eventInputPostDue$.map((e) => (e.ownerTarget).value),
    eventInputPostTask$.map((e) => (e.ownerTarget).value),
    eventInputPostStatus$.map((e) => (e.ownerTarget).value))).
    map(x => ({
      url: 'http://127.0.0.1:3000/todos.json',
      category: 'api',
      method: 'POST',
      send: {
        type: 'application/json',
        todo: {
          due: x[1],
          task: x[2],
          status: x[3]
        }
      }
    })
  );

  // レスポンス Observable を取得する
  const response$ = HTTP.select('api').flatten().startWith({response: {}});
  const vtree$ = xs.of(h('div', [
    h('div.form-group', [h('input#post-due.form-control')]),
    h('div.form-group', [h('input#post-task.form-control')]),
    h('div.form-group', [h('input#post-status.form-control')]),
    h('button#post.btn.btn-outline-primary.btn-block', ['POST'])
  ]));

  return {
    DOM: vtree$,
    HTTP: request$,
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
  '/todos/:id': id => sources => Todo({props$: {id}, sources}),
  '/new': TodoForm,
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
        h('a.pure-menu-link', { props: { href: '/new' } }, 'New')
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
