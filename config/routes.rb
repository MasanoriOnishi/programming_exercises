Rails.application.routes.draw do
  resources :user_settings, param: :user_id
  resources :todos
  # For details on the DSL available within this file, see http://guides.rubyonrails.org/routing.html
end
