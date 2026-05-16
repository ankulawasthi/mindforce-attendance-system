class AddIdleSecondsToAttendances < ActiveRecord::Migration[8.1]
  def change
    add_column :attendances, :idle_seconds, :integer, default: 0
  end
end
