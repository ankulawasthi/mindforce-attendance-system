class Holiday < ApplicationRecord
  validates :name, presence: true
  validates :date, presence: true, uniqueness: true

  scope :upcoming, -> { where("date >= ?", Date.today).order(:date) }
  scope :for_month, ->(month, year) { where("EXTRACT(MONTH FROM date) = ? AND EXTRACT(YEAR FROM date) = ?", month, year) }
end