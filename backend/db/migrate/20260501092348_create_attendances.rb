class CreateAttendances < ActiveRecord::Migration[8.1]
  def change
    create_table :attendances do |t|
      t.integer :user_id, null: false
      t.date :date, null: false
      t.datetime :clock_in
      t.datetime :clock_out
      t.integer :status, null: false, default: 0
      t.decimal :total_hours, precision: 5, scale: 2
      t.string :ip_address

      t.timestamps
    end

    add_index :attendances, :user_id
    add_index :attendances, :date
    add_index :attendances, [:user_id, :date], unique: true
  end
end