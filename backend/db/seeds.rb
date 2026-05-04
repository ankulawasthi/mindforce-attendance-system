puts "Seeding database..."

# Clear existing data
LeaveRequest.destroy_all
Attendance.destroy_all
Break.destroy_all
User.destroy_all
Department.destroy_all

# Create departments (without manager first)
operations       = Department.create!(name: "Operations")
data_quality     = Department.create!(name: "Data Quality")
client_services  = Department.create!(name: "Client Services")
online_sample    = Department.create!(name: "Online Sample")
programming_dp   = Department.create!(name: "Programming & Data Processing")

puts "✅ 5 Departments created"

# Create Director
anupam = User.create!(
  name:        "Anupam",
  email:       "anupam@mindforce.com",
  password:    "password123",
  role:        :director,
  is_active:   true,
  joined_at:   Date.new(2020, 1, 1)
)

puts "✅ Director created: #{anupam.name}"

# Create Managers
shikha = User.create!(
  name:          "Shikha",
  email:         "shikha@mindforce.com",
  password:      "password123",
  role:          :manager,
  department_id: operations.id,
  is_active:     true,
  joined_at:     Date.new(2020, 3, 1)
)

vineet = User.create!(
  name:          "Vineet",
  email:         "vineet@mindforce.com",
  password:      "password123",
  role:          :manager,
  department_id: data_quality.id,
  is_active:     true,
  joined_at:     Date.new(2020, 3, 1)
)

mohit = User.create!(
  name:          "Mohit Beri",
  email:         "mohit@mindforce.com",
  password:      "password123",
  role:          :manager,
  department_id: client_services.id,
  is_active:     true,
  joined_at:     Date.new(2020, 3, 1)
)

kapil = User.create!(
  name:          "Kapil",
  email:         "kapil@mindforce.com",
  password:      "password123",
  role:          :manager,
  department_id: online_sample.id,
  is_active:     true,
  joined_at:     Date.new(2020, 3, 1)
)

rajendra = User.create!(
  name:          "Rajendra",
  email:         "rajendra@mindforce.com",
  password:      "password123",
  role:          :manager,
  department_id: programming_dp.id,
  is_active:     true,
  joined_at:     Date.new(2020, 3, 1)
)

puts "✅ 5 Managers created"

# Assign managers to departments
operations.update!(manager_id:      shikha.id)
data_quality.update!(manager_id:    vineet.id)
client_services.update!(manager_id: mohit.id)
online_sample.update!(manager_id:   kapil.id)
programming_dp.update!(manager_id:  rajendra.id)

puts "✅ Managers assigned to departments"

# Create sample employees
[
  { name: "Employee 1",  email: "emp1@mindforce.com",  department_id: operations.id },
  { name: "Employee 2",  email: "emp2@mindforce.com",  department_id: operations.id },
  { name: "Employee 3",  email: "emp3@mindforce.com",  department_id: data_quality.id },
  { name: "Employee 4",  email: "emp4@mindforce.com",  department_id: client_services.id },
  { name: "Employee 5",  email: "emp5@mindforce.com",  department_id: online_sample.id },
  { name: "Employee 6",  email: "emp6@mindforce.com",  department_id: programming_dp.id },
].each do |emp|
  User.create!(
    name:          emp[:name],
    email:         emp[:email],
    password:      "password123",
    role:          :employee,
    department_id: emp[:department_id],
    is_active:     true,
    joined_at:     Date.new(2021, 6, 1)
  )
end

puts "✅ Sample employees created"

# Add holidays
[
  { name: "New Year",         date: Date.new(2026, 1, 1),   is_optional: false },
  { name: "Republic Day",     date: Date.new(2026, 1, 26),  is_optional: false },
  { name: "Holi",             date: Date.new(2026, 3, 14),  is_optional: false },
  { name: "Independence Day", date: Date.new(2026, 8, 15),  is_optional: false },
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
puts "Departments : #{Department.count}"
puts "Users       : #{User.count}"
puts "Directors   : #{User.director.count}"
puts "Managers    : #{User.manager.count}"
puts "Employees   : #{User.employee.count}"
puts "Holidays    : #{Holiday.count}"
puts "--- Done! ---"