class RoomBooking < ApplicationRecord
  belongs_to :meeting_room
  belongs_to :user

  enum :status, { confirmed: 0, cancelled: 1 }

  validates :title,      presence: true
  validates :date,       presence: true
  validates :start_time, presence: true
  validates :end_time,   presence: true
  validate  :no_conflict
  validate  :end_after_start

  scope :upcoming, -> { where('date >= ?', Date.today).order(date: :asc) }
  scope :for_user, ->(user_id) { where(user_id: user_id) }

  private

  def end_after_start
    return unless start_time && end_time
    errors.add(:end_time, "must be after start time") if end_time <= start_time
  end

  def no_conflict
    return unless meeting_room && date && start_time && end_time
    conflicts = RoomBooking.where(
      meeting_room_id: meeting_room_id,
      date: date,
      status: :confirmed
    ).where.not(id: id)

    conflicts.each do |b|
      if b.start_time < end_time && b.end_time > start_time
        errors.add(:base, "Room is already booked for this time slot")
        break
      end
    end
  end
end