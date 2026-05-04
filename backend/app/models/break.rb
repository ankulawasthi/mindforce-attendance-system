class Break < ApplicationRecord
  belongs_to :attendance

  enum :break_type, { lunch: 0, short: 1, personal: 2 }

  validates :attendance_id, presence: true
  validates :break_start, presence: true

  scope :exceeded, -> { where(is_exceeded: true) }
  scope :active,   -> { where(break_end: nil) }

  def calculate_duration
    return unless break_start && break_end
    ((break_end - break_start) / 60).round
  end
end