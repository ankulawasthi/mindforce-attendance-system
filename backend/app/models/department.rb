class Department < ApplicationRecord
  belongs_to :manager, class_name: "User", foreign_key: "manager_id", optional: true
  has_many :users, foreign_key: "department_id"

  validates :name, presence: true, uniqueness: true
end