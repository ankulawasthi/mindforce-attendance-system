class User < ApplicationRecord
  has_secure_password

  belongs_to :department, optional: true
  has_many :attendances
  has_many :leave_requests
  has_many :approved_leaves, class_name: "LeaveRequest", foreign_key: "approved_by"
  has_many :room_bookings, dependent: :destroy

  enum :role, { director: 0, manager: 1, employee: 2 }

  validates :name,        presence: true
  validates :email,       presence: true, uniqueness: true,
                          format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :role,        presence: true
  validates :employee_id, presence: true, uniqueness: true

  scope :active,        -> { where(is_active: true) }
  scope :by_department, ->(dept_id) { where(department_id: dept_id) }

  def generate_jwt
    JWT.encode(
      {
        sub:           id,
        exp:           8.hours.from_now.to_i,
        role:          role,
        department_id: department_id
      },
      ENV["JWT_SECRET_KEY"],
      "HS256"
    )
  end
end