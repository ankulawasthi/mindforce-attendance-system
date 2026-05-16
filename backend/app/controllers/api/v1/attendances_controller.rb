module Api
  module V1
    class AttendancesController < ApplicationController

      # GET /api/v1/attendances/today
      def today
        attendances = if current_user.director?
          Attendance.includes(:user, :breaks).where(date: Date.today)
        elsif current_user.manager?
          Attendance.includes(:user, :breaks)
                    .where(date: Date.today)
                    .for_department(current_user.department_id)
        else
          Attendance.includes(:breaks).where(user_id: current_user.id, date: Date.today)
        end

        render json: attendances.map { |a| attendance_json(a) }, status: :ok
      end

      # GET /api/v1/attendances
      def index
        attendances = if current_user.director?
          Attendance.includes(:user, :breaks).order(date: :desc)
        elsif current_user.manager?
          Attendance.includes(:user, :breaks)
                    .for_department(current_user.department_id)
                    .order(date: :desc)
        else
          Attendance.includes(:breaks).where(user_id: current_user.id).order(date: :desc)
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
      def clock_out
        attendance = Attendance.find_by(user_id: current_user.id, date: Date.today)
      
        if attendance.nil?
          return render json: { error: "You haven't checked in today" }, status: :unprocessable_entity
        end
      
        if attendance.clock_out.present?
          return render json: { error: "Already checked out today" }, status: :unprocessable_entity
        end
      
        total_break_mins = attendance.breaks.sum(:duration_mins) || 0
        total_seconds    = (Time.current - attendance.clock_in).to_i
        work_seconds     = total_seconds - (total_break_mins * 60)
        work_hours       = (work_seconds / 3600.0).round(2)
      
        status = Attendance.status_for_work_seconds(total_seconds)
        idle_seconds = params[:idle_seconds].to_i
      
        attendance.update(
          clock_out:    Time.current,
          total_hours:  work_hours,
          status:       status,
          idle_seconds: idle_seconds
        )
      
        message = case status
                  when :present  then "✅ Full Day recorded (#{work_hours}h worked)"
                  when :half_day then "⚠️ Half Day recorded (#{work_hours}h worked)"
                  when :absent   then "❌ Marked Absent (#{work_hours}h worked)"
                  end
      
        render json: attendance_json(attendance).merge({ message: message }), status: :ok
      end

      # GET /api/v1/attendances/export
      def export
        attendances = scoped_attendances
        attendances = apply_date_filters(attendances)
        csv_data = generate_csv(attendances)
        filename = "attendance_#{Date.today.strftime('%Y_%m_%d')}.csv"

        send_data csv_data,
          type:        'text/csv; charset=utf-8',
          disposition: "attachment; filename=#{filename}"
      end 

      private
        
      def scoped_attendances
        case current_user.role
        when 'director'
          Attendance.includes(:user).order(date: :desc)
        when 'manager'
          Attendance.includes(:user)
                    .joins(:user)
                    .where(users: { department_id: current_user.department_id })
                    .order(date: :desc)
        else
          Attendance.includes(:user)
                    .where(user_id: current_user.id)
                    .order(date: :desc)
        end
      end
      
      def apply_date_filters(attendances)
        attendances = attendances.where('date >= ?', params[:start_date]) if params[:start_date].present?
        attendances = attendances.where('date <= ?', params[:end_date])   if params[:end_date].present?
        attendances
      end
      
      IST = ActiveSupport::TimeZone["Asia/Kolkata"]

      # Converts total seconds → "HH:MM:SS" string
      def fmt_duration(total_seconds)
        return "00:00:00" if total_seconds.nil? || total_seconds <= 0
        h = total_seconds / 3600
        m = (total_seconds % 3600) / 60
        s = total_seconds % 60
        format("%02d:%02d:%02d", h, m, s)
      end

      def generate_csv(attendances)
        CSV.generate(headers: true, encoding: 'UTF-8') do |csv|
          csv << ['Date', 'Employee ID', 'Employee Name', 'Department',
                  'Check In (IST)', 'Check Out (IST)',
                  'Working Hours', 'Break Time', 'Idle Time', 'Productivity Hours',
                  'Status']

          attendances.each do |a|
            # ── Timestamps in IST ──────────────────────────────────────────
            ci_ist  = a.clock_in  ? a.clock_in.in_time_zone(IST)  : nil
            co_ist  = a.clock_out ? a.clock_out.in_time_zone(IST) : nil

            check_in  = ci_ist  ? ci_ist.strftime('%I:%M:%S %p')  : '-'
            check_out = co_ist  ? co_ist.strftime('%I:%M:%S %p')  : '-'

            # ── Working seconds from raw timestamps (not stored total_hours) ──
            if ci_ist
              end_point   = co_ist || Time.current.in_time_zone(IST)
              work_secs   = [(end_point - ci_ist).to_i, 0].max
            else
              work_secs   = 0
            end

            # ── Break time (already stored as minutes) ──────────────────────
            total_break_mins = a.breaks.sum(:duration_mins).to_i
            break_secs       = total_break_mins * 60

            # ── Idle time ───────────────────────────────────────────────────
            idle_secs = (a.idle_seconds || 0).to_i

            # ── Productivity = Working - Break - Idle ───────────────────────
            productivity_secs = [0, work_secs - break_secs - idle_secs].max

            # ── Status: mark open sessions as "Active" ──────────────────────
            status = if co_ist.nil? && ci_ist
                       "Active"
                     else
                       a.status&.humanize || "-"
                     end

            csv << [
              a.date,
              a.user&.employee_id,
              a.user&.name,
              a.user&.department&.name,
              check_in,
              check_out,
              fmt_duration(work_secs),
              fmt_duration(break_secs),
              fmt_duration(idle_secs),
              fmt_duration(productivity_secs),
              status
            ]
          end
        end
      end


      def attendance_params
        params.require(:attendance).permit(:status, :clock_in, :clock_out, :total_hours)
      end

      def attendance_json(attendance)
        total_break_mins = attendance.breaks.sum(:duration_mins).to_i
        {
          id:               attendance.id,
          user_id:          attendance.user_id,
          user_name:        attendance.user&.name,
          date:             attendance.date,
          clock_in:         attendance.clock_in,
          clock_out:        attendance.clock_out,
          status:           attendance.status,
          total_hours:      attendance.total_hours,
          total_break_mins: total_break_mins,
          ip_address:       attendance.ip_address
        }
      end
      
    end # End Class
  end # End V1
end # End Api