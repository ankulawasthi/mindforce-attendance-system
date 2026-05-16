rooms = [
  { name: 'Aryabhata', capacity: 8, email: 'aryabhata@mindforce.com' },
  { name: 'Bhabha', capacity: 6, email: 'bhabha@mindforce.com' },
  { name: 'Bose', capacity: 4, email: 'bose@mindforce.com' },
  { name: 'Chandrasekhar', capacity: 6, email: 'chandrasekhar@mindforce.com' },
  { name: 'Kalam', capacity: 22, email: 'kalam@mindforce.com' }
]

rooms.each do |r|
  room = MeetingRoom.find_or_initialize_by(name: r[:name])
  room.update!(
    capacity: r[:capacity],
    email: r[:email],
    location: 'Noida',
    is_active: true
  )
end

puts "Rooms seeded successfully!"
