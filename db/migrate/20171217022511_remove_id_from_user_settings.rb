class RemoveIdFromUserSettings < ActiveRecord::Migration[5.1]
  def change
    remove_column :user_settings, :id, :int
  end
end
