class Attendance < ApplicationRecord
  belongs_to :user
  has_many :breaks

  enum :status, { present: 0, absent: 1, half_day: 2, late: 3, on_leave: 4 }

  # Thresholds based on TOTAL time (including breaks)
  # Present  = 8 hrs total (with 10 min buffer = 7h 50m)
  # Half Day = 4 hrs total (with 10 min buffer = 3h 50m)
  # Absent   = below 4 hrs total
  BUFFER_MINS          = 10
  MIN_PRESENT_SECONDS  = (8.hours - BUFFER_MINS.minutes).to_i   # 7h 50m
  MIN_HALF_DAY_SECONDS = (4.hours - BUFFER_MINS.minutes).to_i   # 3h 50m

  validates :user_id, presence: true
  validates :date,    presence: true
  validates :user_id, uniqueness: { scope: :date, message: "already has attendance for this date" }

  scope :for_date,       ->(date)        { where(date: date) }
  scope :for_month,      ->(month, year) { where("EXTRACT(MONTH FROM date) = ? AND EXTRACT(YEAR FROM date) = ?", month, year) }
  scope :for_department, ->(dept_id)     { joins(:user).where(users: { department_id: dept_id }) }

  def self.status_for_work_seconds(total_seconds)
    if total_seconds >= MIN_PRESENT_SECONDS
      :present   # 7h 50m+ total time → Full Day
    elsif total_seconds >= MIN_HALF_DAY_SECONDS
      :half_day  # 3h 50m–7h 50m total time → Half Day
    else
      :absent    # below 3h 50m → Absent
    end
  end
end