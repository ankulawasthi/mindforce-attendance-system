class Attendance < ApplicationRecord
  belongs_to :user
  has_many :breaks

  enum :status, { present: 0, absent: 1, half_day: 2, late: 3, on_leave: 4 }

  # Thresholds based on TOTAL time (including breaks)
  # Present  = >= 9 hrs
  # Half Day = >= 4 hrs and < 9 hrs
  # Absent   = < 4 hrs
  MIN_PRESENT_SECONDS  = 9.hours.to_i
  MIN_HALF_DAY_SECONDS = 4.hours.to_i

  validates :user_id, presence: true
  validates :date,    presence: true
  validates :user_id, uniqueness: { scope: :date, message: "already has attendance for this date" }

  scope :for_date,       ->(date)        { where(date: date) }
  scope :for_month,      ->(month, year) { where("EXTRACT(MONTH FROM date) = ? AND EXTRACT(YEAR FROM date) = ?", month, year) }
  scope :for_department, ->(dept_id)     { joins(:user).where(users: { department_id: dept_id }) }

  def self.status_for_work_seconds(total_seconds)
    if total_seconds >= MIN_PRESENT_SECONDS
      :present   # 9h+ total time → Full Day
    elsif total_seconds >= MIN_HALF_DAY_SECONDS
      :half_day  # 4h-9h total time → Half Day
    else
      :absent    # below 4h → Absent
    end
  end
end