module Api
  module V1
    class RoomBookingsController < ApplicationController

      # GET /api/v1/room_bookings
      def index
        bookings = if current_user.director?
          RoomBooking.includes(:meeting_room, :user).order(date: :asc, start_time: :asc)
        elsif current_user.manager?
          RoomBooking.includes(:meeting_room, :user)
                     .joins(:user)
                     .where(users: { department_id: current_user.department_id })
                     .order(date: :asc, start_time: :asc)
        else
          RoomBooking.includes(:meeting_room, :user)
                     .where(user_id: current_user.id)
                     .order(date: :asc, start_time: :asc)
        end

        bookings = bookings.where(date: params[:date]) if params[:date].present?
        bookings = bookings.where(status: params[:status]) if params[:status].present?

        render json: bookings.map { |b| booking_json(b) }, status: :ok
      end

      # POST /api/v1/room_bookings
      def create
        booking = RoomBooking.new(booking_params)
        booking.user_id = current_user.id
        booking.status  = :confirmed

        if booking.save
          render json: booking_json(booking), status: :created
        else
          render json: { errors: booking.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # DELETE /api/v1/room_bookings/:id
      def destroy
        booking = RoomBooking.find(params[:id])

        unless booking.user_id == current_user.id || current_user.director? || current_user.manager?
          return render json: { error: "Access denied" }, status: :forbidden
        end

        booking.update(status: :cancelled)
        render json: { message: "Booking cancelled successfully" }, status: :ok
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Booking not found" }, status: :not_found
      end

      private

      def booking_params
        params.require(:room_booking).permit(
          :meeting_room_id, :title, :date,
          :start_time, :end_time, :notes
        )
      end

      # 🔥 FIXED JSON RESPONSE (IMPORTANT)
      def booking_json(b)
        {
          id:            b.id,
          title:         b.title,

          # ✅ STANDARDIZED FIELD
          name:          b.meeting_room&.name,
          location:      b.meeting_room&.location,
          capacity:      b.meeting_room&.capacity,

          room_id:       b.meeting_room_id,
          user_id:       b.user_id,
          booked_by:     b.user&.name,
          department:    b.user&.department&.name,

          date:          b.date,
          start_time:    b.start_time,
          end_time:      b.end_time,
          notes:         b.notes,
          status:        b.status
        }
      end
    end
  end
end