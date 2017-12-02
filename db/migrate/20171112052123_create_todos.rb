class CreateTodos < ActiveRecord::Migration[5.1]
  def change
    create_table :todos do |t|
      t.date :due
      t.string :task
      t.string :status
      t.integer :user_id

      t.timestamps
    end
  end
end
