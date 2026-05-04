class CreateBreaks < ActiveRecord::Migration[8.1]
  def change
    create_table :breaks do |t|
      t.integer :attendance_id, null: false
      t.datetime :break_start, null: false
      t.datetime :break_end
      t.integer :duration_mins
      t.integer :break_type, null: false, default: 0

      t.timestamps
    end

    add_index :breaks, :attendance_id
  end
end