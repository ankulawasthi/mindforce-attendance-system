class CreateLeaveRequests < ActiveRecord::Migration[8.1]
  def change
    create_table :leave_requests do |t|
      t.integer :user_id, null: false
      t.integer :leave_type, null: false, default: 0
      t.date :from_date, null: false
      t.date :to_date, null: false
      t.text :reason
      t.integer :status, null: false, default: 0
      t.integer :approved_by

      t.timestamps
    end

    add_index :leave_requests, :user_id
    add_index :leave_requests, :status
    add_index :leave_requests, :approved_by
  end
end