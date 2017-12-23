class CreateUserSettings < ActiveRecord::Migration[5.1]
  def change
    create_table :user_settings do |t|
      t.string :user_id
      t.string :sort
      t.string :filter

      t.timestamps
    end
    execute "ALTER TABLE user_settings CHANGE COLUMN `id` `id` int(10) unsigned NOT NULL ;"
    execute "ALTER TABLE user_settings DROP PRIMARY KEY, ADD PRIMARY KEY (user_id);"
  end
end
