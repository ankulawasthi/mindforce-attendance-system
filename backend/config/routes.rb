Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do

      # ---------------- AUTH ----------------
      post   "auth/login",  to: "auth#login"
      delete "auth/logout", to: "auth#logout"
      get    "auth/me",     to: "auth#me"
      patch  "auth/change_password", to: "auth#change_password"

      # ---------------- DEPARTMENTS ----------------
      resources :departments, only: [:index, :show, :create, :update]

      # ---------------- USERS ----------------
      resources :users, only: [:index, :show, :create, :update, :destroy]

      # ---------------- ATTENDANCE ----------------
      resources :attendances, only: [:index, :show, :create, :update] do
        collection do
          post :clock_in
          post :clock_out
          get  :today
          get  :export
        end
      end

      # ---------------- BREAKS ----------------
      resources :breaks, only: [:index, :create, :update] do
        collection do
          get :department_summary
        end
      end

      # ---------------- LEAVE REQUESTS ----------------
      resources :leave_requests, only: [:index, :show, :create, :update] do
        member do
          patch :approve
          patch :reject
        end
      end

      # ---------------- MEETING ROOMS ----------------
      resources :meeting_rooms, only: [:index, :show, :create, :update]

      # ---------------- ROOM BOOKINGS ----------------
      resources :room_bookings, only: [:index, :create, :destroy]

      # ---------------- REPORTS ----------------
      namespace :reports do
        get :attendance
        get :leaves
        get :department_summary
      end

    end
  end

  # ---------------- HEALTH CHECK ----------------
  get "up" => "rails/health#show", as: :rails_health_check
end