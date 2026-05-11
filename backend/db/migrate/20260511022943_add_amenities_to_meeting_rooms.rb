class AddAmenitiesToMeetingRooms < ActiveRecord::Migration[8.1]
  def change
    add_column :meeting_rooms, :amenities, :text
  end
end
