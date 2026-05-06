Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      # Auth
      post   "auth/login",  to: "auth#login"
      delete "auth/logout", to: "auth#logout"
      get    "auth/me",     to: "auth#me"
      patch  "auth/change_password", to: "auth#change_password"

      # Departments
      resources :departments, only: [:index, :show, :create, :update]

      # Users
      resources :users, only: [:index, :show, :create, :update, :destroy]

      # Attendance
      resources :attendances, only: [:index, :show, :create, :update] do
        collection do
          post :clock_in
          post :clock_out
          get  :today
          get  :export
        end
      end

      # Breaks
      resources :breaks, only: [:index, :create, :update] do
  collection do
    get :department_summary
  end
end

      # Leave Requests
      resources :leave_requests, only: [:index, :show, :create, :update] do
        member do
          patch :approve
          patch :reject
        end
      end

      # Reports
      namespace :reports do
        get :attendance
        get :leaves
        get :department_summary
      end
    end
  end

  get "up" => "rails/health#show", as: :rails_health_check
end