module Api
  module V1
    class MeetingRoomsController < ApplicationController

      # GET /api/v1/meeting_rooms
      def index
        rooms = MeetingRoom.active.includes(:room_bookings)
        date  = params[:date] || Date.today.to_s

        render json: rooms.map { |r| room_json(r, date) }, status: :ok
      end

      # GET /api/v1/meeting_rooms/:id
      def show
        room = MeetingRoom.find(params[:id])
        render json: room_json(room, params[:date] || Date.today.to_s), status: :ok
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Room not found" }, status: :not_found
      end

      # POST /api/v1/meeting_rooms (director only)
      def create
        require_director!
        room = MeetingRoom.new(room_params)
        if room.save
          render json: room_json(room, Date.today.to_s), status: :created
        else
          render json: { errors: room.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # PATCH /api/v1/meeting_rooms/:id (director only)
      def update
        require_director!
        room = MeetingRoom.find(params[:id])
        if room.update(room_params)
          render json: room_json(room, Date.today.to_s), status: :ok
        else
          render json: { errors: room.errors.full_messages }, status: :unprocessable_entity
        end
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Room not found" }, status: :not_found
      end

      private

      def room_params
        params.require(:meeting_room).permit(:name, :capacity, :location, :amenities, :is_active)
      end

      def room_json(room, date)
        today_bookings = room.room_bookings.where(date: date, status: :confirmed)
        {
          id:          room.id,
          name:        room.name,
          capacity:    room.capacity,
          location:    room.location,
          amenities:   room.amenities,
          is_active:   room.is_active,
          bookings_today: today_bookings.count,
          booked_slots: today_bookings.map { |b|
            {
              id:         b.id,
              title:      b.title,
              start_time: b.start_time,
              end_time:   b.end_time,
              booked_by:  b.user&.name
            }
          }
        }
      end
    end
  end
end