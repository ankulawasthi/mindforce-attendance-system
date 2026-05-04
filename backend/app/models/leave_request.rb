class LeaveRequest < ApplicationRecord
  belongs_to :user
  belongs_to :approver, class_name: "User", foreign_key: "approved_by", optional: true

  enum :leave_type, { casual: 0, sick: 1, earned: 2, unpaid: 3 }
  enum :status,     { pending: 0, approved: 1, rejected: 2 }
  enum :leave_slot, { full_day: 0, first_half: 1, second_half: 2 }

  validates :user_id,    presence: true
  validates :leave_type, presence: true
  validates :from_date,  presence: true
  validates :to_date,    presence: true
  validate  :to_date_after_from_date

  scope :for_department,   ->(dept_id) { joins(:user).where(users: { department_id: dept_id }) }
  scope :pending_requests, -> { where(status: :pending) }

  private

  def to_date_after_from_date
    return unless from_date && to_date
    errors.add(:to_date, "must be after or equal to from date") if to_date < from_date
  end
end