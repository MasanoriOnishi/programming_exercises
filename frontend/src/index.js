import xs from 'xstream'
import {run} from '@cycle/run';
import {makeHTTPDriver} from '@cycle/http';
import {div, h1, makeDOMDriver, button, h4, a, tr, table, tbody, thead, td, li, ul, span, th, h} from '@cycle/dom';
import { makeHistoryDriver } from '@cycle/history';
import switchPath from 'switch-path';
import {routerify} from 'cyclic-router';
import sampleCombine from 'xstream/extra/sampleCombine'
import {makeAuth0Driver, protect} from "cyclejs-auth0";

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
    h('div.form-group', [h('div', '期限日'), h('input#post-due.form-control')]),
    h('div.form-group', [h('div', 'タスク内容'),h('input#post-task.form-control')]),
    h('div.form-group', [h('div', '状態'),h('input#post-status.form-control')]),
    h('button#post.btn.btn-outline-primary.btn-block', ['POST'])
  ]));

  return {
    DOM: vtree$,
    HTTP: request$,
  };
}

let deleteTodoUrl = function(todoId) {
  return "http://127.0.0.1:3000/todos/" + todoId + '.json';
};

let getTodoId = function(evt) {
  return parseInt(evt.target.dataset.todoId, 10);
};

const TODO_LIST_URL = "http://127.0.0.1:3000/todos";

function TodoList(sources) {

  let deleteTodo$ = sources.DOM.select("button.deleteTodo").events("click")
    .map(getTodoId);

  function intent(domSource) {
    return {
      sort_due_action$: domSource.select('button.sort_due').events('click'),
      filter_complete_action$: domSource.select('button.filter_complete').events('click'),
      filter_uncomplete_action$: domSource.select('button.filter_uncomplete').events('click'),
      filter_all_action$: domSource.select('button.filter_all').events('click'),
    };
  }

  let request$ = deleteTodo$
    .map(todoId => ({
        method: "DEL",
        url: deleteTodoUrl(todoId),
        category: 'todos'
      })
    ).startWith({
      url: TODO_LIST_URL,
      category: 'todos',
    });

  // TODO 後でuser毎にstatusを保持できるようにする
  let sort_status = "desc"
  let filter_status = "all";

  function model(actions) {
    const todos$ = sources.HTTP
      .select('todos')
      .flatten()
      .map(res => res.body)

    const sortedList$ = actions.sort_due_action$
      .mapTo(
        function changeRouteReducer(todosData) {
          if (sort_status === "desc") {
            todosData.sort((a, b) => a.due > b.due ? 1 : -1)
            sort_status = "asc"
          } else {
            todosData.sort((a, b) => a.due < b.due ? 1 : -1)
            sort_status = "desc"
          }
          return todosData;
      });

    const filterdComletedList$ = actions.filter_complete_action$
      .mapTo((todosData) => {
        filter_status = "complete"
        return todosData}
      );

    const filterdAllList$ = actions.filter_all_action$
      .mapTo((todosData) => {
        filter_status = "all"
        return todosData}
      );

    const filterdUncompletedList$ = actions.filter_uncomplete_action$
      .mapTo((todosData) => {
        filter_status = "uncomplete"
        return todosData}
      );

    return todos$.map(
      todos => xs.merge(
        sortedList$,
        filterdComletedList$,
        filterdAllList$,
        filterdUncompletedList$
      )
      .fold((data, reducer) => reducer(data), todos))
      .flatten()
  }

  let renderTodo = todo => {
    if (!todo) {
      return;
    }
    return tr([
    td(todo.due),
    td(todo.task),
    td(todo.status),
    td(a({ props: { href: '/todos/' + todo.id }}, 'Show')),
    td(button(".deleteTodo", { attrs: { "data-todo-id": todo.id }}, 'Delete'))
    ])
  }

  function view(state$) {
    const filterStatusView = todo => {
      if (filter_status === "complete"){
        return todo.status === "完了" ? todo : null
      } else if (filter_status === "uncomplete"){
        return todo.status === "未対応" ? todo : null
      } else {
        return todo
      }
    }
    return state$.map(todos =>
      h('div', [
        h('div', [
          h('span', '状態: '),
          h('button.filter_all', 'すべて'),
          h('button.filter_complete', '完了'),
          h('button.filter_uncomplete', '未対応')
        ]),
        h('table', {}, [
          h('thead', {}, h('tr', {}, [
            h('td', ["Due", h('button.sort_due', 'sort')]),
            h('td', "Task"),
            h('td', "Status")
          ])),
          h('tbody',{}, todos.map(filterStatusView).map(renderTodo))
          ])
        ]
      )
    );
  }

  const vdom$ = view(model(intent(sources.DOM)));

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
      todo === null ? null : h('div.todo-details', [
        h('div', 'Due: '  + todo.due),
        h('div', 'Task: ' + todo.task),
        h('div', 'Status: ' + todo.status),
        h('a', {attrs: {href: '/'}}, 'Back')
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
    return protect(value)(Object.assign({}, sources, {
      router: sources.router.path(path)
    }));
  });

  const clickHref$ = sources.DOM.select('a').events('click');
  const history$ = clickHref$.map(ev => ev.target.pathname);
  const vtree$ = page$.map(c => c.DOM).flatten().map(childVnode => h('div#app', {}, [navbar(), childVnode]));
  const requests$ = page$.map(x => x.HTTP).filter(x => !!x).flatten();
  const logout$ = sources.DOM
      .select(".logout")
      .events("click")
      .mapTo({ action: "logout" });

  const sinks = {
    DOM: vtree$,
    router: history$,
    preventDefault: clickHref$,
    HTTP: requests$,
    auth0: xs.merge(page$.map(x => x.auth0).filter(x => !!x).flatten(), logout$)
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
        h('a.pure-menu-link', { props: { href: '/' } }, 'TodoList')
      ]),
      h("button.logout", "logout")
    ])
  ]);
}

const mainWithRouting = routerify(main, switchPath)

const drivers = {
  DOM: makeDOMDriver('#root'),
  history: makeHistoryDriver(),
  preventDefault: event$ => event$.subscribe({ next: e => e.preventDefault() }),
  HTTP: makeHTTPDriver(),
  auth0: makeAuth0Driver(
    'E1pNA0XWgOg5IemG3zpYr2N9u17ETlwL',
    'todoapplication.auth0.com',
  )
};

run(mainWithRouting, drivers)
