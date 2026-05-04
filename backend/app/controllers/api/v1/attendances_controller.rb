module Api
  module V1
    class AttendancesController < ApplicationController

      # GET /api/v1/attendances/today
      def today
        attendances = if current_user.director?
          Attendance.includes(:user).where(date: Date.today)
        elsif current_user.manager?
          Attendance.includes(:user)
                    .where(date: Date.today)
                    .for_department(current_user.department_id)
        else
          Attendance.where(user_id: current_user.id, date: Date.today)
        end

        render json: attendances.map { |a| attendance_json(a) }, status: :ok
      end

      # GET /api/v1/attendances
      def index
        attendances = if current_user.director?
          Attendance.includes(:user).order(date: :desc)
        elsif current_user.manager?
          Attendance.includes(:user)
                    .for_department(current_user.department_id)
                    .order(date: :desc)
        else
          Attendance.where(user_id: current_user.id).order(date: :desc)
        end

        attendances = attendances.for_date(params[:date]) if params[:date].present?
        attendances = attendances.for_month(params[:month], params[:year]) if params[:month].present?

        render json: attendances.map { |a| attendance_json(a) }, status: :ok
      end

      # GET /api/v1/attendances/:id
      def show
        attendance = Attendance.find(params[:id])
        render json: attendance_json(attendance), status: :ok
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Attendance not found" }, status: :not_found
      end

      # POST /api/v1/attendances/clock_in
      def clock_in
        existing = Attendance.find_by(user_id: current_user.id, date: Date.today)

        if existing
          return render json: { error: "Already clocked in today" }, status: :unprocessable_entity
        end

        attendance = Attendance.new(
          user_id:    current_user.id,
          date:       Date.today,
          clock_in:   Time.current,
          status:     :present,
          ip_address: request.remote_ip
        )

        if attendance.save
          render json: attendance_json(attendance), status: :created
        else
          render json: { errors: attendance.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # POST /api/v1/attendances/clock_out
      # def clock_out
      #   attendance = Attendance.find_by(user_id: current_user.id, date: Date.today)

      #   if attendance.nil?
      #     return render json: { error: "You haven't clocked in today" }, status: :unprocessable_entity
      #   end

      #   if attendance.clock_out.present?
      #     return render json: { error: "Already clocked out today" }, status: :unprocessable_entity
      #   end

      #   total_break_mins  = attendance.breaks.sum(:duration_mins) || 0
      #   total_work_seconds = Time.current - attendance.clock_in
      #   net_work_seconds  = [total_work_seconds - (total_break_mins * 60), 0].max
      #   work_hours        = (net_work_seconds / 3600.0).round(2)
      #   attendance_status = Attendance.status_for_work_seconds(net_work_seconds)

      #   attendance.update(
      #     clock_out:   Time.current,
      #     total_hours: work_hours,
      #     status:      attendance_status
      #   )

      #   render json: attendance_json(attendance), status: :ok
      # end
      def clock_out
        attendance = Attendance.find_by(user_id: current_user.id, date: Date.today)
      
        if attendance.nil?
          return render json: { error: "You haven't checked in today" }, status: :unprocessable_entity
        end
      
        if attendance.clock_out.present?
          return render json: { error: "Already checked out today" }, status: :unprocessable_entity
        end
      
        total_break_mins = attendance.breaks.sum(:duration_mins) || 0
        work_seconds     = (Time.current - attendance.clock_in) - (total_break_mins * 60)
        work_hours       = (work_seconds / 3600.0).round(2)
        status           = Attendance.status_for_work_seconds(work_seconds)
      
        attendance.update(
          clock_out:   Time.current,
          total_hours: work_hours,
          status:      status
        )
      
        message = case status
                  when :present  then "✅ Full Day recorded (#{work_hours}h)"
                  when :half_day then "⚠️ Half Day recorded (#{work_hours}h — min 3h 50m for half day)"
                  when :absent   then "❌ Marked Absent (#{work_hours}h — below minimum)"
                  end
      
        render json: attendance_json(attendance).merge({ message: message }), status: :ok
      end

      # PATCH /api/v1/attendances/:id
      def update
        require_manager_or_above!
        attendance = Attendance.find(params[:id])

        if attendance.update(attendance_params)
          render json: attendance_json(attendance), status: :ok
        else
          render json: { errors: attendance.errors.full_messages }, status: :unprocessable_entity
        end
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Attendance not found" }, status: :not_found
      end

      private

      def attendance_params
        params.require(:attendance).permit(:status, :clock_in, :clock_out, :total_hours)
      end

      def attendance_json(attendance)
        {
          id:          attendance.id,
          user_id:     attendance.user_id,
          user_name:   attendance.user&.name,
          date:        attendance.date,
          clock_in:    attendance.clock_in,
          clock_out:   attendance.clock_out,
          status:      attendance.status,
          total_hours: attendance.total_hours,
          ip_address:  attendance.ip_address
        }
      end
    end
  end
end