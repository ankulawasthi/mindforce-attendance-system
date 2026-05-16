module Api
  module V1
    class BreaksController < ApplicationController

      BREAK_LIMITS = {
        "lunch"   => { max_duration: 45, max_count: 1 },
        "short"   => { max_duration: 15, max_count: 2 },
        "personal"=> { max_duration: nil, max_count: nil }
      }.freeze

      # GET /api/v1/breaks?attendance_id=1
      def index
        if params[:attendance_id]
          attendance = Attendance.find(params[:attendance_id])
          breaks = attendance.breaks
        elsif params[:user_id]
          require_manager_or_above!
          today = Attendance.find_by(user_id: params[:user_id], date: Date.today)
          breaks = today ? today.breaks : []
        else
          today = Attendance.find_by(user_id: current_user.id, date: Date.today)
          breaks = today ? today.breaks : []
        end

        render json: breaks.map { |b| break_json(b) }, status: :ok
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Not found" }, status: :not_found
      end

      # POST /api/v1/breaks (start break)
      def create
        attendance = Attendance.find_by(user_id: current_user.id, date: Date.today)

        return render json: { error: "You haven't checked in today" }, status: :unprocessable_entity if attendance.nil?
        return render json: { error: "You have already checked out" }, status: :unprocessable_entity if attendance.clock_out.present?

        active_break = attendance.breaks.find_by(break_end: nil)
        return render json: { error: "You already have an active break" }, status: :unprocessable_entity if active_break

        break_type = params[:break_type] || "short"
        limit = BREAK_LIMITS[break_type] || {}

        # Check count limit
        if limit[:max_count]
          count = attendance.breaks.where(break_type: break_type).count
          if count >= limit[:max_count]
            return render json: {
              error: "#{break_type.capitalize} break limit reached (max #{limit[:max_count]} per day)"
            }, status: :unprocessable_entity
          end
        end

        b = attendance.breaks.new(
          break_start: Time.current,
          break_type:  break_type,
          reason:      params[:reason]
        )

        if b.save
          render json: break_json(b), status: :created
        else
          render json: { errors: b.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # PATCH /api/v1/breaks/:id (end break)
      def update
        b = Break.find(params[:id])

        return render json: { error: "Break already ended" }, status: :unprocessable_entity if b.break_end.present?

        duration = ((Time.current - b.break_start) / 60).round
        limit    = BREAK_LIMITS[b.break_type] || {}
        exceeded = limit[:max_duration] && duration > limit[:max_duration]

        b.update(
          break_end:     Time.current,
          duration_mins: duration,
          is_exceeded:   exceeded
        )

        render json: break_json(b).merge({
          warning: exceeded ? "⚠️ Break exceeded limit by #{duration - limit[:max_duration]} minutes" : nil
        }), status: :ok
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Break not found" }, status: :not_found
      end

      # GET /api/v1/breaks/department_summary (manager view)
      def department_summary
        require_manager_or_above!

        dept_id = current_user.director? ? params[:department_id] : current_user.department_id
        today_attendances = Attendance.for_department(dept_id).where(date: Date.today)

        summary = today_attendances.map do |att|
          breaks       = att.breaks
          active       = breaks.find_by(break_end: nil)
          exceeded     = breaks.where(is_exceeded: true)
          total_break  = breaks.sum(:duration_mins)

          {
            user_id:        att.user_id,
            user_name:      att.user&.name,
            total_break_mins: total_break,
            break_count:    breaks.count,
            has_active_break: active.present?,
            active_since:   active&.break_start,
            active_type:    active&.break_type,
            exceeded_breaks: exceeded.count,
            flagged:        exceeded.any?,
            breaks:         breaks.map { |b| break_json(b) }
          }
        end

        render json: summary, status: :ok
      end

      private

      def break_json(b)
        limit    = BREAK_LIMITS[b.break_type] || {}
        duration = b.duration_mins || (b.break_end.nil? ? ((Time.current - b.break_start) / 60).round : 0)

        {
          id:            b.id,
          attendance_id: b.attendance_id,
          break_type:    b.break_type,
          break_start:   b.break_start,
          break_end:     b.break_end,
          duration_mins: duration,
          is_exceeded:   b.is_exceeded || false,
          max_allowed:   limit[:max_duration],
          is_active:     b.break_end.nil?,
          reason:        b.reason
        }
      end
    end
  end
end