class Break < ApplicationRecord
  belongs_to :attendance

  enum :break_type, { 
    lunch: 0, 
    short: 1, 
    personal: 2,
    bio_break: 3,
    training: 4,
    meeting: 5,
    application_issue: 6,
    system_issue: 7,
    townhall: 8,
    team_party: 9,
    client_call: 10,
    knowledge_session: 11,
    hr_discussion: 12,
    technical_support: 13,
    internet_power_issue: 14
  }

  validates :attendance_id, presence: true
  validates :break_start, presence: true

  scope :exceeded, -> { where(is_exceeded: true) }
  scope :active,   -> { where(break_end: nil) }

  def calculate_duration
    return unless break_start && break_end
    ((break_end - break_start) / 60).round
  end
end