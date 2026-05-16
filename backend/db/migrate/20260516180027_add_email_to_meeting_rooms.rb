class AddEmailToMeetingRooms < ActiveRecord::Migration[8.1]
  def change
    add_column :meeting_rooms, :email, :string
  end
end
