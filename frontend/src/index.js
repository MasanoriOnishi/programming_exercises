import xs from 'xstream'
import {run} from '@cycle/run';
import {makeHTTPDriver} from '@cycle/http';
import {div, h1, makeDOMDriver, button, h4, a, tr, table, tbody, thead, td, li, ul, span, th, h, header, p, h2} from '@cycle/dom';
import { makeHistoryDriver } from '@cycle/history';
import switchPath from 'switch-path';
import {routerify} from 'cyclic-router';
import sampleCombine from 'xstream/extra/sampleCombine'
import {makeAuth0Driver, protect} from "cyclejs-auth0";
import jwt from "jwt-decode";
import serialize from "form-serialize";

function Home(sources) {
  const vtree$ = xs.of(h('h1', {}, 'Hello I am Home'));
  return {
    DOM: vtree$
  };
}

function TodoForm({DOM, HTTP, props}) {
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
    eventInputPostStatus$.map((e) => (e.ownerTarget).value),
    getAuthUserInfo(props.tokens$))).
    map(x => ({
      url: 'http://127.0.0.1:3000/todos.json',
      category: 'api',
      method: 'POST',
      send: {
        type: 'application/json',
        todo: {
          due: x[1],
          task: x[2],
          status: x[3],
          user_id: x[4].sub,
        }
      },
      headers: {redirect: true, redirectUrl: '/'}
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

let getAuthUserInfo = function(tokens) {
  return tokens
    .map(tokens => {
        return tokens ? // /!\ if user is not logged in, tokens is null
          jwt(tokens.idToken) :
          null
    });
};

const TODO_LIST_URL = "http://127.0.0.1:3000/todos";

function TodoList({DOM, HTTP, props}) {
  let deleteTodo$ = DOM.select("button.deleteTodo").events("click")
    .map(getTodoId);

  function intent(domSource) {
    return {
      sort_due_action$: domSource.select('button.sort_due').events('click'),
      filter_complete_action$: domSource.select('button.filter_complete').events('click'),
      filter_uncomplete_action$: domSource.select('button.filter_uncomplete').events('click'),
      filter_all_action$: domSource.select('button.filter_all').events('click'),
    };
  }

  let todos_action$ = getAuthUserInfo(props.tokens$)
    .map(x => ({
      url: TODO_LIST_URL,
      category: 'todos',
      method: 'GET',
      query: {
        user_id: x.sub
      }}
    ))

  let delete_action$ = deleteTodo$
    .map(todoId => ({
        method: "DEL",
        url: deleteTodoUrl(todoId),
        category: 'todos'
      }
    ))

  // TODO 後でuser毎にstatusを保持できるようにする
  let sort_status = "desc"
  let filter_status = "all";

  function model(actions) {
    const todos$ = HTTP
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
      td(todo.id),
      td(todo.due),
      td(todo.task),
      td(todo.status),
      td(todo.parent_id || {}),
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
            h('td', "ID"),
            h('td', ["Due", h('button.sort_due', 'sort')]),
            h('td', "Task"),
            h('td', "Status"),
            h('td', "PID")
          ])),
          h('tbody',{}, todos.map(filterStatusView).map(renderTodo))
          ])
        ]
      )
    );
  }

  const vdom$ = view(model(intent(DOM)));

  return {
    DOM: vdom$,
    HTTP: xs.merge(todos_action$, delete_action$)
  };
}

function Todo({props$, sources}) {
  const {HTTP, DOM, props} = sources
  const serializeForm = function(evt) {
    return serialize(evt.target.form, {hash: true});
  };

  function intent(domSource) {
    const createSubTodoEvent$ = domSource.select("#post").events("click");
    const updateTodoEvent$ = domSource.select("#update").events("click");
    const preventDefault$ = xs.merge(updateTodoEvent$, createSubTodoEvent$);
    return {
      createSubTodoEvent$: createSubTodoEvent$,
      updateTodoEvent$: updateTodoEvent$,
      preventDefault: preventDefault$
    };
  }

  function model(actions) {
    const todo_action$ = xs.of({
      url: 'http://127.0.0.1:3000/todos/' + String(props$.id) + '.json', // GET method by default
      category: 'todo',
    });

    const todo$ = HTTP.select('todo')
      .flatten()
      .map(res => res.body)
      .startWith(null);

    const family_todos_action$ = todo$
      .map(todo => {
        return todo === null ? {} :{
        url: TODO_LIST_URL,
        category: 'family_todos',
        method: 'GET',
        query: {
          parent_id: todo.parent_id || props$.id,
        }}
      })

    const family_todos$ = HTTP.select('family_todos')
      .flatten()
      .map(res => res.body)
      .startWith([]);

    const createSubTodo$ = actions.createSubTodoEvent$.map(serializeForm);
    const create_sub_todo_action$ = createSubTodo$.compose(sampleCombine(
      getAuthUserInfo(props.tokens$).map(x => x ? x.sub: null))).
      map(function(model) {
        let todo = model[0];
        todo.user_id = model[1];
        todo.parent_id = props$.id;
        return {
          category: 'api',
          method: 'POST',
          url: 'http://127.0.0.1:3000/todos.json',
          send: {
            type: 'application/json',
            todo: todo
          },
          headers: {redirect: true, redirectUrl: '/todos/' + props$.id}
        };
      });

    const updateTodo$ = actions.updateTodoEvent$.map(serializeForm);
    const update_todo_action$ = updateTodo$.compose(sampleCombine(
      getAuthUserInfo(props.tokens$).map(x => x ? x.sub: null))).
      map(function(model) {
        let todo = model[0];
        todo.user_id = model[1];
        return {
          category: 'update',
          method: 'PUT',
          url: 'http://127.0.0.1:3000/todos/' + String(props$.id) + '.json',
          send: {
            type: 'application/json',
            todo: todo
          },
          headers: {redirect: true, redirectUrl: '/todos/' + props$.id}
        };
      });

    const modal = ModalComponent({
      props: {
        // モーダルの前面に表示する DOM 要素
        content$: xs.of(
          h('div', [
            h('header.panel-heading', [
              h('button#dialog-close.close', [
                h('span','×')
              ])
            ]),
            h('form', [
              h('div.form-group', [
                h('div', '期限日'),
                h('input#post-due.form-control', { props: {type:"text", name:"due"}})
              ]),
              h('div.form-group', [
                h('div', 'タスク内容'),
                h('input#post-task.form-control', { props: {type:"text", name:"task"}})
              ]),
              h('div.form-group', [
                h('div', '状態'),
                h('select#post-status.form-control', { props: {name:"status"}}, [
                  h('option', '未対応'),
                  h('option', '完了')
                ])
              ]),
              h('button#post.btn.btn-outline-primary.btn-block', ['POST']),
            ])
          ]),
        ),
        // モーダルを表示するかどうか
        visibility$: xs.merge(
          sources.DOM.select('#dialog-open').events('click').mapTo(true),
          sources.DOM.select('#dialog-close').events('click').mapTo(false)
        ).startWith(false)
      }
    });

    return {
      state: xs.combine(todo$, family_todos$, modal.DOM),
      HTTP: xs.merge(
        todo_action$,
        create_sub_todo_action$,
        family_todos_action$,
        update_todo_action$
      ),
    };
  }

  const renderSubTodo = todo => {
    if (!todo) {
      return;
    }
    return tr(todo.id == props$.id ? { props: { style: 'color:red' }} : {}, [
      td(todo.id),
      td(todo.due),
      td(todo.task),
      td(todo.status),
      td(todo.parent_id || {}),
      td(a({ props: { href: '/todos/' + todo.id }}, 'Show')),
    ])
  }

  function view(state$) {
    return state$.map(([todo, todos, modal]) =>
      h('div.todos', [
        todo === null ? null : h('form', [
          h('div.form-group', [
            h('div', '期限日'),
            h('input#update-due.form-control',{ props: { value: todo.due, type:"text", name:"due"}})
          ]),
          h('div.form-group', [
            h('div', 'タスク内容'),
            h('input#update-task.form-control',{ props: { value: todo.task, type:"text", name:"task"}})
          ]),
          h('div.form-group', [
            h('div', '状態'),
            h('select#post-status.form-control', { props: {name:"status"}}, [
              h('option', todo.status === '未対応' ? {props: {selected:"selected"}} : {}, '未対応'),
              h('option', todo.status === '完了' ? {props: {selected:"selected"}} : {}, '完了')
            ])
          ]),
          h('button#update.btn.btn-outline-primary.btn-block', ['POST']),
        ]),
        h('div',[
          '親子課題',
          todo && todo.parent_id != null ? null :
          h('button#dialog-open.btn.btn-default', '子課題を追加する'),
          modal,
        ]),
        h('table', {}, [
          h('thead', {}, h('tr', {}, [
            h('td', "ID"),
            h('td', "Due"),
            h('td', "Task"),
            h('td', "Status"),
            h('td', "PID")
          ])),
          h('tbody',{}, todos.map(renderSubTodo))
        ]),
        h('div', [
          h('a', {attrs: {href: '/'}}, 'Back')
        ]),
      ])
    );
  };

  const intent$ = intent(DOM);
  const model$ = model(intent$);
  const vdom$ = view(model$.state);

  return {
    DOM: vdom$,
    HTTP: model$.HTTP,
    preventDefault: intent$.preventDefault
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
  const postRedirects$ = sources.HTTP
    .select()
    .filter(res$ => res$.request.method === 'POST')
    .flatten() //Needed because HTTP gives an Observable when you map it
    .debug(resp => {console.log('POST response', resp)})
    .filter(resp => resp.status === 201 && resp.req.header && resp.req.header.redirectUrl)
    .map(resp => resp.req.header.redirectUrl)
  const putRedirects$ = sources.HTTP
    .select()
    .filter(res$ => res$.request.method === 'PUT')
    .flatten() //Needed because HTTP gives an Observable when you map it
    .debug(resp => {console.log('PUT response', resp)})
    .filter(resp => resp.status === 200 && resp.req.header && resp.req.header.redirectUrl)
    .map(resp => resp.req.header.redirectUrl)

  const vtree$ = page$.map(c => c.DOM).flatten().map(childVnode => h('div#app', {}, [navbar(), childVnode]));
  const requests$ = page$.map(x => x.HTTP).filter(x => !!x).flatten();
  const logout$ = sources.DOM
      .select(".logout")
      .events("click")
      .mapTo({ action: "logout" });

  const sinks = {
    DOM: vtree$,
    router: xs.merge(history$, postRedirects$, putRedirects$),
    preventDefault: xs.merge(page$.map(x => x.preventDefault).filter(x => !!x).flatten(), clickHref$),
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

const auth0Config = {
    auth: {
        params: { scope: "openid nickname" },
        responseType: "token",
    },
    closable: false,
};

const drivers = {
  DOM: makeDOMDriver('#root'),
  history: makeHistoryDriver(),
  preventDefault: event$ => event$.subscribe({ next: e => e.preventDefault() }),
  HTTP: makeHTTPDriver(),
  auth0: makeAuth0Driver(
    'E1pNA0XWgOg5IemG3zpYr2N9u17ETlwL',
    'todoapplication.auth0.com',
    auth0Config
  )
};

run(mainWithRouting, drivers)


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
