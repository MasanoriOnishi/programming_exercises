class AddParentIdToTodos < ActiveRecord::Migration[5.1]
  def change
    add_column :todos, :parent_id, :string
  end
end
