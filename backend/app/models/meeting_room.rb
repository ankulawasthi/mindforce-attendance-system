class MeetingRoom < ApplicationRecord
  has_many :room_bookings

  validates :name,     presence: true
  validates :capacity, presence: true, numericality: { greater_than: 0 }

  scope :active, -> { where(is_active: true) }

  def available?(date, start_time, end_time, exclude_booking_id = nil)
    bookings = room_bookings.where(date: date, status: :confirmed)
    bookings = bookings.where.not(id: exclude_booking_id) if exclude_booking_id
    bookings.none? do |b|
      b.start_time < end_time && b.end_time > start_time
    end
  end
end