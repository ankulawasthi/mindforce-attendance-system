puts "Seeding database..."

# Clear existing data
LeaveRequest.destroy_all
Attendance.destroy_all
Break.destroy_all
RoomBooking.destroy_all
MeetingRoom.destroy_all
User.destroy_all
Department.destroy_all
Holiday.destroy_all

# ── Departments ──────────────────────────────────────────
operations      = Department.create!(name: "Operations")
data_quality    = Department.create!(name: "Data Quality")
client_services = Department.create!(name: "Client Services")
online_sample   = Department.create!(name: "Online Sample")
programming_dp  = Department.create!(name: "Programming & Data Processing")

puts "✅ 5 Departments created"

# ── Director ─────────────────────────────────────────────
anupam = User.create!(
  name:        "Anupam",
  email:       "anupam@mindforce.com",
  password:    "password123",
  role:        :director,
  employee_id: "10116",
  is_active:   true,
  joined_at:   Date.new(2020, 1, 1)
)
puts "✅ Director created: #{anupam.name}"

# ── Managers ─────────────────────────────────────────────
shikha = User.create!(
  name:          "Shikha",
  email:         "shikha@mindforce.com",
  password:      "password123",
  role:          :manager,
  department_id: operations.id,
  employee_id:   "10305",
  is_active:     true,
  joined_at:     Date.new(2020, 3, 1)
)

vineet = User.create!(
  name:          "Vineet",
  email:         "vineet@mindforce.com",
  password:      "password123",
  role:          :manager,
  department_id: data_quality.id,
  employee_id:   "10195",
  is_active:     true,
  joined_at:     Date.new(2020, 3, 1)
)

mohit = User.create!(
  name:          "Mohit Beri",
  email:         "mohit@mindforce.com",
  password:      "password123",
  role:          :manager,
  department_id: client_services.id,
  employee_id:   "10104",
  is_active:     true,
  joined_at:     Date.new(2020, 3, 1)
)

kapil = User.create!(
  name:          "Kapil",
  email:         "kapil@mindforce.com",
  password:      "password123",
  role:          :manager,
  department_id: online_sample.id,
  employee_id:   "10253",
  is_active:     true,
  joined_at:     Date.new(2020, 3, 1)
)

rajendra = User.create!(
  name:          "Rajendra",
  email:         "rajendra@mindforce.com",
  password:      "password123",
  role:          :manager,
  department_id: programming_dp.id,
  employee_id:   "10461",
  is_active:     true,
  joined_at:     Date.new(2020, 3, 1)
)

puts "✅ 5 Managers created"

# ── Assign managers to departments ───────────────────────
operations.update!(manager_id:      shikha.id)
data_quality.update!(manager_id:    vineet.id)
client_services.update!(manager_id: mohit.id)
online_sample.update!(manager_id:   kapil.id)
programming_dp.update!(manager_id:  rajendra.id)

puts "✅ Managers assigned to departments"

# ── Sample Employees ─────────────────────────────────────
[
  { name: "Employee 1", email: "emp1@mindforce.com", department_id: operations.id,      employee_id: "EMP0001" },
  { name: "Employee 2", email: "emp2@mindforce.com", department_id: operations.id,      employee_id: "EMP0002" },
  { name: "Employee 3", email: "emp3@mindforce.com", department_id: data_quality.id,    employee_id: "EMP0003" },
  { name: "Employee 4", email: "emp4@mindforce.com", department_id: client_services.id, employee_id: "EMP0004" },
  { name: "Employee 5", email: "emp5@mindforce.com", department_id: online_sample.id,   employee_id: "EMP0005" },
  { name: "Employee 6", email: "emp6@mindforce.com", department_id: programming_dp.id,  employee_id: "EMP0006" },
].each do |emp|
  User.create!(
    name:          emp[:name],
    email:         emp[:email],
    password:      "password123",
    role:          :employee,
    employee_id:   emp[:employee_id],
    department_id: emp[:department_id],
    is_active:     true,
    joined_at:     Date.new(2021, 6, 1)
  )
end

puts "✅ Sample employees created"

# ── Meeting Rooms ─────────────────────────────────────────
[
  { name: 'Aryabhata',     capacity: 8,  email: 'aryabhata@mindforce.com',     location: 'Noida', amenities: 'Projector, Whiteboard'                          },
  { name: 'Bhabha',        capacity: 6,  email: 'bhabha@mindforce.com',        location: 'Noida', amenities: 'TV Screen, Whiteboard'                          },
  { name: 'Bose',          capacity: 4,  email: 'bose@mindforce.com',          location: 'Noida', amenities: 'TV Screen'                                      },
  { name: 'Chandrasekhar', capacity: 6,  email: 'chandrasekhar@mindforce.com', location: 'Noida', amenities: 'Projector, AC'                                  },
  { name: 'Kalam',         capacity: 22, email: 'kalam@mindforce.com',         location: 'Noida', amenities: 'Projector, Video Conference, AC, Whiteboard'    },
].each do |r|
  MeetingRoom.find_or_initialize_by(name: r[:name]).update!(
    capacity:  r[:capacity],
    email:     r[:email],
    location:  r[:location],
    amenities: r[:amenities],
    is_active: true
  )
end

puts "✅ #{MeetingRoom.count} Meeting Rooms seeded"

# ── Holidays ──────────────────────────────────────────────
[
  { name: "New Year",         date: Date.new(2026, 1,  1),  is_optional: false },
  { name: "Republic Day",     date: Date.new(2026, 1,  26), is_optional: false },
  { name: "Holi",             date: Date.new(2026, 3,  14), is_optional: false },
  { name: "Independence Day", date: Date.new(2026, 8,  15), is_optional: false },
  { name: "Gandhi Jayanti",   date: Date.new(2026, 10, 2),  is_optional: false },
  { name: "Diwali",           date: Date.new(2026, 10, 20), is_optional: false },
  { name: "Christmas",        date: Date.new(2026, 12, 25), is_optional: false },
].each do |h|
  Holiday.find_or_create_by!(date: h[:date]) do |holiday|
    holiday.name        = h[:name]
    holiday.is_optional = h[:is_optional]
  end
end

puts "✅ 7 Holidays created"

puts ""
puts "--- Seed Summary ---"
puts "Departments   : #{Department.count}"
puts "Users         : #{User.count}"
puts "Directors     : #{User.director.count}"
puts "Managers      : #{User.manager.count}"
puts "Employees     : #{User.employee.count}"
puts "Meeting Rooms : #{MeetingRoom.count}"
puts "Holidays      : #{Holiday.count}"
puts "--- Done! ---"