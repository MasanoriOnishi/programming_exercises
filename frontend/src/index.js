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
import Calendar from '../src/calendar_widget';
import ModalComponent from '../src/modal_component';

function Home(sources) {
  const vtree$ = xs.of(h('h1', {}, 'Hello I am Home'));
  return {
    DOM: vtree$
  };
}

const error_message_todo = function(response, type) {
  return 'errors' in response && type in response.errors ? response.errors[type][0] : null
}

const serializeForm = function(evt) {
  return serialize(evt.target.form, {hash: true});
};

function TodoForm({DOM, HTTP, props}) {
  function intent(domSource) {
    const createTodoEvent$ = domSource.select("#post").events("click");
    const preventDefault$ = xs.merge(createTodoEvent$);
    return {
      createTodoEvent$: createTodoEvent$,
      preventDefault: preventDefault$
    };
  }

  function model(actions) {
    const createTodo$ = actions.createTodoEvent$.map(serializeForm);
    const create_todo_action$ = createTodo$.compose(sampleCombine(
      getAuthUserInfo(props.tokens$).map(x => x ? x.sub: null))).
      map(function(model) {
        let todo = model[0];
        todo.user_id = model[1];
        return {
          category: 'create',
          method: 'POST',
          url: 'http://127.0.0.1:3000/todos.json',
          send: {
            type: 'application/json',
            todo: todo
          },
          headers: {redirect: true, redirectUrl: '/'}
        };
      });

    const create_response$ = HTTP.select('create')
      .flatten()
      .map(res => JSON.parse(res.text))
      .startWith({})

    const create_calendar = Calendar({DOM});

    return {
      state: xs.combine(
        create_response$,
        create_calendar.DOM,
        create_calendar.value$
      ),
      HTTP: create_todo_action$
    }
  }
  function view(state$) {
    return state$.map(([create_response, calendarVTree, calendarValue]) =>
    h('div', [
    h('form', [
      h('div.form-group', [
        h('div', '期限日'),
        h('div.input-group', [
          h('input#post-due.form-control', { props: {type:"text", name:"due", value: calendarValue}}),
          calendarVTree,
      ])]),
      h('div', { props: { style: 'color:red' }} ,[error_message_todo(create_response, 'due')]),
      h('div.form-group', [
        h('div', 'タスク内容'),
        h('input#post-task.form-control', { props: {type:"text", name:"task"}}),
        h('div', { props: { style: 'color:red' }} ,[error_message_todo(create_response, 'task')]),
      ]),
      h('div.form-group', [
        h('div', '状態'),
        h('select#post-status.form-control', { props: {name:"status"}}, [
          h('option', '未対応'),
          h('option', '完了')
        ])
      ]),
      h('button#post.btn.btn-success', ['SAVE']),
    ])
  ]))};

  const intent$ = intent(DOM);
  const model$ = model(intent$);
  const vdom$ = view(model$.state);

  return {
    DOM: vdom$,
    HTTP: model$.HTTP,
    preventDefault: intent$.preventDefault
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
  let sort_status = "desc"
  let filter_status = "all";

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

  let user_setting_action$ = getAuthUserInfo(props.tokens$)
    .map(x => ({
      url: 'http://127.0.0.1:3000/user_settings/' + String(x.sub) + '.json', // GET method by default
      category: 'user_setting',
      method: 'GET',
      }
    ))

  function model(actions) {
    const todos$ = HTTP
      .select('todos')
      .flatten()
      .map(res => res.body)

    const user_setting$ = HTTP
      .select('user_setting')
      .flatten()
      .map(res => res.body)

    const sortTodos = todosData => {
      if (sort_status === "desc") {
        todosData.sort((a, b) => a.due > b.due ? 1 : -1)
        sort_status = "asc"
      } else {
        todosData.sort((a, b) => a.due < b.due ? 1 : -1)
        sort_status = "desc"
      }
      return todosData;
    }

    const initializeTodos = ([todosData, user_setting]) => {
      filter_status = user_setting.filter
      sort_status = user_setting.sort
      return sortTodos(todosData)
    }

    const init_todos$ = xs
      .combine(todos$, user_setting$)
      .map(initializeTodos)

    const sortedList$ = actions.sort_due_action$
      .mapTo(sortTodos);

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

    let sort_action$ = actions.sort_due_action$
      .compose(sampleCombine(
        getAuthUserInfo(props.tokens$).map(x => x ? x.sub: null),
        user_setting$
      ))
      .map(x => ({
          method: 'PUT',
          url: 'http://127.0.0.1:3000/user_settings/' + String(x[1]) + '.json',
          send: {
            type: 'application/json',
            user_setting: {
              sort: sort_status
            }
          },
          category: 'sort_todos',
        }
      ))

    let filterRequest = ([x, status]) => {
      filter_status = status
      return ({
        method: 'PUT',
        url: 'http://127.0.0.1:3000/user_settings/' + String(x[1]) + '.json',
        send: {
          type: 'application/json',
          user_setting: {
            filter: status
          }
        },
        category: 'filter_todos',
      }
    )}

    let filter_all_resuest$ = actions.filter_all_action$
      .compose(sampleCombine(
        getAuthUserInfo(props.tokens$).map(x => x ? x.sub: null),
        user_setting$
      ))
      .map(x => filterRequest([x, "all"]))

    let filter_complete_resuest$ = actions.filter_complete_action$
      .compose(sampleCombine(
        getAuthUserInfo(props.tokens$).map(x => x ? x.sub: null),
        user_setting$
      ))
      .map(x => filterRequest([x, "complete"]))

    let filter_uncomplete_resuest$ = actions.filter_uncomplete_action$
      .compose(sampleCombine(
        getAuthUserInfo(props.tokens$).map(x => x ? x.sub: null),
        user_setting$
      ))
      .map(x => filterRequest([x, "uncomplete"]))

    return {
      state: init_todos$
        .map(
          x => xs.merge(
            sortedList$,
            filterdComletedList$,
            filterdAllList$,
            filterdUncompletedList$
        )
        .fold((data, reducer) => reducer(data), x))
        .flatten(),
      HTTP: xs.merge(
        todos_action$,
        delete_action$,
        user_setting_action$,
        sort_action$,
        filter_all_resuest$,
        filter_complete_resuest$,
        filter_uncomplete_resuest$,
      )
    }
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
      td(a(".btn.btn-primary", { props: { href: '/todos/' + todo.id}}, 'Show')),
      td(button(".deleteTodo.btn.btn-danger", { attrs: { "data-todo-id": todo.id }}, 'Delete'))
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
    return state$
    .map(todos =>
      h('div', [
        h('div', [
          h('span', '状態: '),
          h('button.filter_all.btn.btn-secondary', 'すべて'),
          h('button.filter_complete.btn.btn-secondary', '完了'),
          h('button.filter_uncomplete.btn.btn-secondary', '未対応')
        ]),
        h('table.table.table-sm', {}, [
          h('thead.thead-inverse', {}, h('tr', {}, [
            h('td', "ID"),
            h('td', ["Due", h('button.sort_due.btn.btn-secondary', 'sort')]),
            h('td', "Task"),
            h('td', "Status"),
            h('td', "PID"),
            h('td'),
            h('td'),
          ])),
          h('tbody',{}, todos.map(filterStatusView).map(renderTodo))
          ])
        ]
      )
    );
  }

  const intent$ = intent(DOM);
  const model$ = model(intent$);
  const vdom$ = view(model$.state);

  return {
    DOM: vdom$,
    HTTP: model$.HTTP,
  };
}

function Todo({props$, sources}) {
  const {HTTP, DOM, props} = sources

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
          category: 'create_sub',
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

    const visibility$ = xs.merge(
        DOM.select('#calendar-open').events('click').mapTo(true),
        DOM.select('#calendar-close').events('click').mapTo(false)
      ).startWith(false)

    const create_sub_calendar = Calendar({DOM, visibility$});

    const create_sub_response$ = HTTP.select('create_sub')
      .flatten()
      .map(res => JSON.parse(res.text))
      .startWith({})

    const modal = ModalComponent({
      props: {
        // モーダルの前面に表示する DOM 要素
        content$: xs.combine(
          create_sub_response$,
          create_sub_calendar.DOM,
          create_sub_calendar.value$)
          .map(([create_sub_response, calendarVTree, calendarValue]) =>
            h('div', [
              h('header.panel-heading', [
                h('button#dialog-close.close', [
                  h('span','×')
                ])
              ]),
              h('form', [
                h('div.form-group', [
                  h('div', '期限日'),
                  h('div.input-group', [
                    h('input#post-due.form-control', { props: {type:"text", name:"due", value: calendarValue}}),
                    calendarVTree,
                ])]),
                h('div', { props: { style: 'color:red' }} ,[error_message_todo(create_sub_response, 'due')]),
                h('div.form-group', [
                  h('div', 'タスク内容'),
                  h('input#post-task.form-control', { props: {type:"text", name:"task"}}),
                  h('div', { props: { style: 'color:red' }} ,[error_message_todo(create_sub_response, 'task')]),
                ]),
                h('div.form-group', [
                  h('div', '状態'),
                  h('select#post-status.form-control', { props: {name:"status"}}, [
                    h('option', '未対応'),
                    h('option', '完了')
                  ])
                ]),
                h('button#post.btn.btn-success', ['SAVE']),
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

    const update_response$ = HTTP.select('update')
      .flatten()
      .map(res => JSON.parse(res.text))
      .startWith({})

    const update_calendar = Calendar({DOM, visibility$});

    return {
      state: xs.combine(
        todo$,
        family_todos$,
        update_response$,
        modal.DOM,
        update_calendar.DOM,
        update_calendar.value$
      ),

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
      td(!(todo.parent_id) ? span('.fa.fa-home') : span('.fa.fa-level-up.fa-rotate-90')),
      td(todo.id),
      td(todo.due),
      td(todo.task),
      td(todo.status),
      td(todo.parent_id || {}),
      td(a('.btn.btn-primary', { props: { href: '/todos/' + todo.id }}, 'Show')),
    ])
  }

  function view(state$) {
    return state$.map(([todo, todos, update_response, modal, calendarVTree, calendarValue]) =>
      h('div.todos', [
        todo === null ? null : h('form', [
          h('div.form-group',{},[
            h('div', '期限日'),
            h('div.input-group', [
              h('input#update-due.form-control',
                { props: {
                    value: calendarValue != null ? calendarValue : todo.due,
                    type:"text",
                    name:"due"
                  }
                }
              ),
              calendarVTree
            ])]),
          h('div', { props: { style: 'color:red' }} ,[error_message_todo(update_response, 'due')]),
          h('div.form-group', [
            h('div', 'タスク内容'),
            h('input#update-task.form-control',{ props: { value: todo.task, type:"text", name:"task"}}),
            h('div', { props: { style: 'color:red' }} ,[error_message_todo(update_response, 'task')]),
          ]),
          h('div.form-group', [
            h('div', '状態'),
            h('select#post-status.form-control', { props: {name:"status"}}, [
              h('option', todo.status === '未対応' ? {props: {selected:"selected"}} : {}, '未対応'),
              h('option', todo.status === '完了' ? {props: {selected:"selected"}} : {}, '完了')
            ])
          ]),
          h('button#update.btn.btn-success', ['SAVE']),
        ]),
        h('div',[
          '親子課題',
          todo && todo.parent_id != null ? null :
          h('button#dialog-open.btn.btn-secondary', '子課題を追加する'),
          modal,
        ]),
        h('table.table', {}, [
          h('thead', {}, h('tr', {}, [
            h('td'),
            h('td', "ID"),
            h('td', "Due"),
            h('td', "Task"),
            h('td', "Status"),
            h('td', "PID"),
            h('td')
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
  return h('nav.navbar.navbar-toggleable-md.navbar-inverse.bg-inverse', {}, [
    h('ul.navbar-nav.mr-auto', {}, [
      h('li.nav-item', {}, [
        h('a.nav-link', { props: { href: '/' } }, 'TOP')
      ]),
      h('li.nav-item', {}, [
        h('a.nav-link', { props: { href: '/new' } }, 'New')
      ]),
    ]),
    h("button.logout.btn.btn-warning", "logout")
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
