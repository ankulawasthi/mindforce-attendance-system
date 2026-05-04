module Api
  module V1
    class AuthController < ApplicationController
      skip_before_action :authenticate_request!, only: [:login]

      def login
        user = User.find_by(email: params[:email]&.downcase&.strip)

        if user&.authenticate(params[:password]) && user.is_active
          token = user.generate_jwt
          render json: {
            success: true,
            token:   token,
            user: {
              id:            user.id,
              name:          user.name,
              email:         user.email,
              role:          user.role,
              department_id: user.department_id
            }
          }, status: :ok
        else
          render json: {
            success: false,
            error:   "Invalid email or password"
          }, status: :unauthorized
        end
      end

      def logout
        render json: { success: true, message: "Logged out successfully" }, status: :ok
      end

      def me
        render json: {
          id:            current_user.id,
          name:          current_user.name,
          email:         current_user.email,
          role:          current_user.role,
          department_id: current_user.department_id
        }, status: :ok
      end

      def change_password
        current_password = params[:current_password].to_s
        new_password = params[:new_password].to_s
        confirm_password = params[:confirm_password].to_s

        unless current_user.authenticate(current_password)
          return render json: { error: "Current password is incorrect" }, status: :unprocessable_entity
        end

        if new_password.length < 6
          return render json: { error: "New password must be at least 6 characters" }, status: :unprocessable_entity
        end

        if new_password != confirm_password
          return render json: { error: "Password confirmation does not match" }, status: :unprocessable_entity
        end

        if current_user.update(password: new_password)
          render json: { success: true, message: "Password changed successfully" }, status: :ok
        else
          render json: { errors: current_user.errors.full_messages }, status: :unprocessable_entity
        end
      end
    end
  end
end