class TodosController < ApplicationController
  before_action :set_todo, only: [:show, :edit, :update, :destroy]

  # GET /todos
  # GET /todos.json
  def index
    user_id = params.fetch(:user_id, nil)
    parent_id = params.fetch(:parent_id, nil)
    if parent_id
      @todos = Todo.where(id:parent_id).or(Todo.where(parent_id:parent_id))
    else
      @todos = Todo.where(user_id:user_id)
    end
    # ADD:一覧で JSON を返す
    render json: @todos
  end

  # GET /todos/1
  # GET /todos/1.json
  def show
    @todo = Todo.find(params[:id])
    render json: @todo
  end

  # GET /todos/new
  def new
    @todo = Todo.new
  end

  # GET /todos/1/edit
  # def edit
  # end

  # POST /todos
  # POST /todos.json
  def create
    @todo = Todo.new(todo_params)
    respond_to do |format|
      if @todo.save
        format.html { redirect_to @todo, notice: 'Todo was successfully created.' }
        format.json { render :show, status: :created, location: @todo }
      else
        format.html { render :new }
        format.json { render :json => { :errors => @todo.errors } }
      end
    end
  end

  # PATCH/PUT /todos/1
  # PATCH/PUT /todos/1.json
  def update
    respond_to do |format|
      if @todo.update(todo_params)
        format.html { redirect_to @todo, notice: 'Todo was successfully updated.' }
        format.json { render :show, status: :ok, location: @todo }
      else
        format.html { render :edit }
        format.json { render :json => { :errors => @todo.errors } }
      end
    end
  end

  # DELETE /todos/1
  # DELETE /todos/1.json
  def destroy
    @todo.destroy
    # respond_to do |format|
    #   format.html { redirect_to todos_url, notice: 'Todo was successfully destroyed.' }
    #   format.json { head :no_content }
    # end
    # 一覧で JSON を返す
    @todos = Todo.all
    render json: @todos
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_todo
      @todo = Todo.find(params[:id])
    end

    # Never trust parameters from the scary internet, only allow the white list through.
    def todo_params
      params.require(:todo).permit(:due, :task, :status, :user_id, :parent_id)
    end
end
