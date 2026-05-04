class ApplicationController < ActionController::API
  before_action :authenticate_request!

  private

  def authenticate_request!
    token = request.headers["Authorization"]&.split(" ")&.last
    if token
      begin
        decoded = JWT.decode(
          token,
          ENV["JWT_SECRET_KEY"],
          true,
          { algorithm: "HS256" }
        )
        @current_user = User.find(decoded[0]["sub"])
      rescue JWT::ExpiredSignature
        render json: { error: "Token expired" }, status: :unauthorized
      rescue JWT::DecodeError
        render json: { error: "Invalid token" }, status: :unauthorized
      end
    else
      render json: { error: "No token provided" }, status: :unauthorized
    end
  end

  def current_user
    @current_user
  end

  def require_director!
    unless current_user&.director?
      render json: { error: "Access denied. Directors only." }, status: :forbidden
    end
  end

  def require_manager_or_above!
    unless current_user&.director? || current_user&.manager?
      render json: { error: "Access denied. Managers and above only." }, status: :forbidden
    end
  end
end