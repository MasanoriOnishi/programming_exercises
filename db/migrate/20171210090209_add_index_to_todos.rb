class AddIndexToTodos < ActiveRecord::Migration[5.1]
  def change
    add_index :todos, :user_id
    add_index :todos, :parent_id
  end
end
