json.extract! user_setting, :id, :user_id, :sort, :filter, :created_at, :updated_at
json.url user_setting_url(user_setting, format: :json)
