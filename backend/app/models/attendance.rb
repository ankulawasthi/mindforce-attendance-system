# class Attendance < ApplicationRecord
#   belongs_to :user
#   has_many :breaks

#   enum :status, { present: 0, absent: 1, half_day: 2, late: 3, on_leave: 4 }
#   FULL_DAY_HOURS = 8
#   HALF_DAY_BUFFER_MINS = 10
#   MIN_FULL_DAY_SECONDS = (FULL_DAY_HOURS.hours - HALF_DAY_BUFFER_MINS.minutes).to_i

#   validates :user_id, presence: true
#   validates :date, presence: true
#   validates :user_id, uniqueness: { scope: :date, message: "already has attendance for this date" }

#   scope :for_date, ->(date) { where(date: date) }
#   scope :for_month, ->(month, year) { where("EXTRACT(MONTH FROM date) = ? AND EXTRACT(YEAR FROM date) = ?", month, year) }
#   scope :for_department, ->(dept_id) { joins(:user).where(users: { department_id: dept_id }) }

#   def self.status_for_work_seconds(work_seconds)
#     work_seconds.to_i < MIN_FULL_DAY_SECONDS ? :half_day : :present
#   end
# end


class Attendance < ApplicationRecord
  belongs_to :user
  has_many :breaks

  enum :status, { present: 0, absent: 1, half_day: 2, late: 3, on_leave: 4 }

  # Constants
  FULL_DAY_HOURS       = 8
  HALF_DAY_HOURS       = 4
  BUFFER_MINS          = 10

  # Thresholds in seconds
  MIN_FULL_DAY_SECONDS = (FULL_DAY_HOURS.hours  - BUFFER_MINS.minutes).to_i  # 7h 50m
  MIN_HALF_DAY_SECONDS = (HALF_DAY_HOURS.hours  - BUFFER_MINS.minutes).to_i  # 3h 50m

  validates :user_id, presence: true
  validates :date,    presence: true
  validates :user_id, uniqueness: { scope: :date, message: "already has attendance for this date" }

  scope :for_date,       ->(date)         { where(date: date) }
  scope :for_month,      ->(month, year)  { where("EXTRACT(MONTH FROM date) = ? AND EXTRACT(YEAR FROM date) = ?", month, year) }
  scope :for_department, ->(dept_id)      { joins(:user).where(users: { department_id: dept_id }) }

  def self.status_for_work_seconds(work_seconds)
    seconds = work_seconds.to_i
    if seconds >= MIN_FULL_DAY_SECONDS
      :present   # 7h 50m+ → Full Day
    elsif seconds >= MIN_HALF_DAY_SECONDS
      :half_day  # 3h 50m–7h 50m → Half Day
    else
      :absent    # below 3h 50m → Absent
    end
  end
end