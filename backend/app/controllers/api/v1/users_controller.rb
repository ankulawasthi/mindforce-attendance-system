module Api
  module V1
    class UsersController < ApplicationController
      before_action :set_user, only: [:show, :update, :destroy]
      before_action :require_manager_or_above!, only: [:index, :create, :update, :destroy]

      def index
        users = if current_user.director?
          User.includes(:department).all
        else
          User.includes(:department).where(department_id: current_user.department_id)
        end

        render json: users.map { |u| user_json(u) }, status: :ok
      end

      def show
        if can_view_user?(@user)
          render json: user_json(@user), status: :ok
        else
          render json: { error: "Access denied" }, status: :forbidden
        end
      end

      def create
  if current_user.manager?
    params[:user][:department_id] = current_user.department_id
    params[:user][:role] = 'employee'
  end

  user = User.new(user_params)

  if user.save
    render json: user_json(user), status: :created
  else
    render json: { errors: user.errors.full_messages }, status: :unprocessable_entity
  end
end

      def update
        if current_user.manager? && @user.department_id != current_user.department_id
          return render json: { error: "Access denied" }, status: :forbidden
        end

        if @user.update(update_params)
          render json: user_json(@user), status: :ok
        else
          render json: { errors: @user.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        require_director!
        @user.update(is_active: false)
        render json: { message: "User deactivated successfully" }, status: :ok
      end

      private

      def set_user
        @user = User.find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: "User not found" }, status: :not_found
      end

      def can_view_user?(user)
        current_user.director? ||
        current_user.id == user.id ||
        (current_user.manager? && current_user.department_id == user.department_id)
      end

      def user_params
  params.require(:user).permit(
    :name,
    :email,
    :password,
    :role,
    :department_id,
    :joined_at,
    :employee_id
  )
end
      def update_params
        params.require(:user).permit(:name, :email, :is_active, :department_id, :joined_at)
      end

      def user_json(user)
     {
    id:            user.id,
    employee_id:   user.employee_id,
    name:          user.name,
    email:         user.email,
    role:          user.role,
    department_id: user.department_id,
    department:    user.department&.name,
    is_active:     user.is_active,
    joined_at:     user.joined_at
  }
end
    end
  end
end