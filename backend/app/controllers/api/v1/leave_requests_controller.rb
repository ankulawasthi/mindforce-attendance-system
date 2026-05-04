module Api
  module V1
    class LeaveRequestsController < ApplicationController

      def index
        requests = if current_user.director?
          LeaveRequest.includes(:user).order(created_at: :desc)
        elsif current_user.manager?
          # Manager sees: their dept employee leaves + their own leaves
          dept_leaves = LeaveRequest.includes(:user)
                                    .for_department(current_user.department_id)
                                    .where.not(user_id: current_user.id)
          own_leaves  = LeaveRequest.where(user_id: current_user.id)
          LeaveRequest.where(id: dept_leaves.pluck(:id) + own_leaves.pluck(:id))
                      .includes(:user).order(created_at: :desc)
        else
          LeaveRequest.where(user_id: current_user.id).order(created_at: :desc)
        end

        requests = requests.where(status: params[:status]) if params[:status].present?
        render json: requests.map { |r| leave_json(r) }, status: :ok
      end

      def show
        request = LeaveRequest.find(params[:id])
        render json: leave_json(request), status: :ok
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Leave request not found" }, status: :not_found
      end

      def create
        request = LeaveRequest.new(leave_params)
        request.user_id = current_user.id
        request.status  = :pending

        if request.save
          render json: leave_json(request), status: :created
        else
          render json: { errors: request.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def approve
        require_manager_or_above!
        request = LeaveRequest.includes(:user).find(params[:id])
        requester = request.user

        # Check approval permission
        if current_user.manager?
          # Manager can only approve employee leaves from own dept
          if requester.manager? || requester.director?
            return render json: { error: "Managers cannot approve other manager leaves" }, status: :forbidden
          end
          if requester.department_id != current_user.department_id
            return render json: { error: "Access denied — not your department" }, status: :forbidden
          end
        end

        # Director approves manager leaves
        if current_user.director? || (current_user.manager? && requester.employee?)
          request.update(status: :approved, approved_by: current_user.id)
          render json: leave_json(request), status: :ok
        else
          render json: { error: "You don't have permission to approve this leave" }, status: :forbidden
        end
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Leave request not found" }, status: :not_found
      end

      def reject
        require_manager_or_above!
        request = LeaveRequest.includes(:user).find(params[:id])
        requester = request.user

        if current_user.manager?
          if requester.manager? || requester.director?
            return render json: { error: "Managers cannot reject other manager leaves" }, status: :forbidden
          end
          if requester.department_id != current_user.department_id
            return render json: { error: "Access denied — not your department" }, status: :forbidden
          end
        end

        if current_user.director? || (current_user.manager? && requester.employee?)
          request.update(status: :rejected, approved_by: current_user.id)
          render json: leave_json(request), status: :ok
        else
          render json: { error: "You don't have permission to reject this leave" }, status: :forbidden
        end
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Leave request not found" }, status: :not_found
      end

      def update
        request = LeaveRequest.find(params[:id])

        if request.user_id != current_user.id
          return render json: { error: "Access denied" }, status: :forbidden
        end

        if request.pending?
          request.update(leave_params)
          render json: leave_json(request), status: :ok
        else
          render json: { error: "Cannot update already processed request" }, status: :unprocessable_entity
        end
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Leave request not found" }, status: :not_found
      end

      private

      def leave_params
        params.require(:leave_request).permit(:leave_type, :from_date, :to_date, :reason, :leave_slot)
      end

      def leave_json(r)
        {
          id:          r.id,
          user_id:     r.user_id,
          user_name:   r.user&.name,
          user_role:   r.user&.role,
          department:  r.user&.department&.name,
          leave_type:  r.leave_type,
	  leave_slot:  r.leave_slot,
          from_date:   r.from_date,
          to_date:     r.to_date,
          reason:      r.reason,
          status:      r.status,
          approved_by: r.approved_by,
          created_at:  r.created_at
        }
      end
    end
  end
end