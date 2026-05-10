class CreateMeetingRooms < ActiveRecord::Migration[7.0]
  def change
    create_table :meeting_rooms do |t|
      t.string  :name,       null: false
      t.integer :capacity,   null: false, default: 1
      t.string  :location
      t.text    :description
      t.boolean :is_active,  null: false, default: true

      t.timestamps
    end

    add_index :meeting_rooms, :name, unique: true
  end
end
