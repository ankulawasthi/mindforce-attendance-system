class AddStatusAndTitleToRoomBookings < ActiveRecord::Migration[7.0]
  def change
    unless column_exists?(:room_bookings, :status)
      add_column :room_bookings, :status, :integer, default: 0, null: false
    end
    unless column_exists?(:room_bookings, :title)
      add_column :room_bookings, :title, :string
    end
    unless column_exists?(:room_bookings, :notes)
      add_column :room_bookings, :notes, :text
    end
  end
end