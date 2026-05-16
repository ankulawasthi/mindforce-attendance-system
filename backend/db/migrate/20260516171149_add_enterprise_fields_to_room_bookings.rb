class AddEnterpriseFieldsToRoomBookings < ActiveRecord::Migration[8.1]
  def change
    add_column :room_bookings, :participant_ids, :jsonb
    add_column :room_bookings, :recurrence, :jsonb
  end
end
