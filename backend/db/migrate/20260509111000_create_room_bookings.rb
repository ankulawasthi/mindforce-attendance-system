class CreateRoomBookings < ActiveRecord::Migration[7.0]
  def change
    create_table :room_bookings do |t|
      t.references :user,         null: false, foreign_key: true
      t.references :meeting_room, null: false, foreign_key: true
      t.date    :date,       null: false
      t.time    :start_time, null: false
      t.time    :end_time,   null: false
      t.string  :title
      t.string  :purpose
      t.integer :status,     default: 0, null: false
      t.text    :notes
      t.timestamps
    end
    add_index :room_bookings, [:meeting_room_id, :date], name: 'index_room_bookings_on_room_date'
  end
end