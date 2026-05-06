module Api
  module V1
    class UsersController < ApplicationController
      before_action :set_user,              only: [:show, :update, :destroy]
      before_action :require_manager_or_above!, only: [:index, :create, :destroy]
      before_action :authorize_update!,     only: [:update]

      # GET /api/v1/users
      def index
        users = if current_user.director?
          User.includes(:department).all
        else
          User.includes(:department).where(department_id: current_user.department_id)
        end
        render json: users.map { |u| user_json(u) }, status: :ok
      end

      # GET /api/v1/users/:id
      def show
        if can_view_user?(@user)
          render json: user_json(@user), status: :ok
        else
          render json: { error: "Access denied" }, status: :forbidden
        end
      end

      # POST /api/v1/users
      def create
        if current_user.manager?
          params[:user][:department_id] = current_user.department_id
          params[:user][:role]          = 'employee'
        end

        user = User.new(user_params)
        if user.save
          render json: user_json(user), status: :created
        else
          render json: { errors: user.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # PATCH /api/v1/users/:id
      def update
        permitted = permitted_update_params

        if @user.update(permitted)
          render json: user_json(@user), status: :ok
        else
          render json: { errors: @user.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # DELETE /api/v1/users/:id
      def destroy
        require_director!
        @user.update(is_active: false)
        render json: { message: "User deactivated successfully" }, status: :ok
      end

      private

      # ── Finders ──────────────────────────────────────────────
      def set_user
        @user = User.find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: "User not found" }, status: :not_found
      end

      # ── Authorization ─────────────────────────────────────────

      # Called before every update action
      def authorize_update!
        authorized = case current_user.role
        when 'director'
          true  # Director can update anyone
        when 'manager'
          # Manager can update own profile OR employees in their dept
          if current_user.id == @user.id
            true
          elsif @user.employee? && @user.department_id == current_user.department_id
            true
          else
            false
          end
        when 'employee'
          # Employee can only update their own profile
          current_user.id == @user.id
        else
          false
        end

        unless authorized
          render json: {
            error: "Access denied — you are not authorized to update this user"
          }, status: :forbidden
        end
      end

      def can_view_user?(user)
        current_user.director? ||
        current_user.id == user.id ||
        (current_user.manager? && current_user.department_id == user.department_id)
      end

      # ── Strong Params ─────────────────────────────────────────

      def user_params
        params.require(:user).permit(
          :name, :email, :password,
          :role, :department_id,
          :joined_at, :employee_id, :job_title
        )
      end

      # Different fields allowed based on who is updating
      def permitted_update_params
        case current_user.role
        when 'director'
          # Director can update everything
          params.require(:user).permit(
            :name, :email, :password,
            :role, :department_id,
            :joined_at, :employee_id,
            :job_title, :is_active
          )
        when 'manager'
          if current_user.id == @user.id
            # Manager updating own profile
            params.require(:user).permit(
              :name, :email, :password, :job_title
            )
          else
            # Manager updating dept employee
            params.require(:user).permit(
              :name, :email, :job_title,
              :joined_at, :employee_id, :is_active
            )
          end
        when 'employee'
          # Employee can only update basic profile fields
          params.require(:user).permit(
            :name, :email, :password, :job_title
          )
        end
      end

      # ── Serializer ────────────────────────────────────────────

      def user_json(user)
        {
          id:            user.id,
          employee_id:   user.employee_id,
          name:          user.name,
          email:         user.email,
          role:          user.role,
          job_title:     user.job_title,
          department_id: user.department_id,
          department:    user.department&.name,
          is_active:     user.is_active,
          joined_at:     user.joined_at
        }
      end
    end
  end
end