# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_05_03_053038) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "attendances", force: :cascade do |t|
    t.datetime "clock_in"
    t.datetime "clock_out"
    t.datetime "created_at", null: false
    t.date "date", null: false
    t.string "ip_address"
    t.integer "status", default: 0, null: false
    t.decimal "total_hours", precision: 5, scale: 2
    t.datetime "updated_at", null: false
    t.integer "user_id", null: false
    t.index ["date"], name: "index_attendances_on_date"
    t.index ["user_id", "date"], name: "index_attendances_on_user_id_and_date", unique: true
    t.index ["user_id"], name: "index_attendances_on_user_id"
  end

  create_table "breaks", force: :cascade do |t|
    t.integer "attendance_id", null: false
    t.datetime "break_end"
    t.datetime "break_start", null: false
    t.integer "break_type", default: 0, null: false
    t.datetime "created_at", null: false
    t.integer "duration_mins"
    t.boolean "is_exceeded"
    t.datetime "updated_at", null: false
    t.index ["attendance_id"], name: "index_breaks_on_attendance_id"
  end

  create_table "departments", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.integer "manager_id"
    t.string "name", null: false
    t.datetime "updated_at", null: false
    t.index ["manager_id"], name: "index_departments_on_manager_id"
    t.index ["name"], name: "index_departments_on_name", unique: true
  end

  create_table "holidays", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.date "date", null: false
    t.boolean "is_optional", default: false, null: false
    t.string "name", null: false
    t.datetime "updated_at", null: false
    t.index ["date"], name: "index_holidays_on_date", unique: true
  end

  create_table "leave_requests", force: :cascade do |t|
    t.integer "approved_by"
    t.datetime "created_at", null: false
    t.date "from_date", null: false
    t.integer "leave_slot", default: 0, null: false
    t.integer "leave_type", default: 0, null: false
    t.text "reason"
    t.integer "status", default: 0, null: false
    t.date "to_date", null: false
    t.datetime "updated_at", null: false
    t.integer "user_id", null: false
    t.index ["approved_by"], name: "index_leave_requests_on_approved_by"
    t.index ["leave_slot"], name: "index_leave_requests_on_leave_slot"
    t.index ["status"], name: "index_leave_requests_on_status"
    t.index ["user_id"], name: "index_leave_requests_on_user_id"
  end

  create_table "users", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.integer "department_id"
    t.string "email", null: false
    t.string "employee_id"
    t.boolean "is_active", default: true, null: false
    t.date "joined_at"
    t.string "name", null: false
    t.string "password_digest", null: false
    t.integer "role", default: 2, null: false
    t.datetime "updated_at", null: false
    t.index ["department_id"], name: "index_users_on_department_id"
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["employee_id"], name: "index_users_on_employee_id", unique: true
    t.index ["role"], name: "index_users_on_role"
  end
end
