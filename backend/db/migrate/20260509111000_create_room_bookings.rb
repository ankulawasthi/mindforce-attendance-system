class CreateRoomBookings < ActiveRecord::Migration[7.0]
  def change
    create_table :room_bookings do |t|
      t.references :user, null: false, foreign_key: true
      t.references :meeting_room, null: false, foreign_key: true
      t.date :date, null: false
      t.time :start_time, null: false
      t.time :end_time, null: false
      t.string :purpose, null: false

      t.timestamps
    end

    add_index :room_bookings, [:meeting_room_id, :date, :start_time, :end_time], name: 'index_room_bookings_on_room_date_time'
  end
end
