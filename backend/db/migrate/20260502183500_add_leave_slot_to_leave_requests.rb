class AddLeaveSlotToLeaveRequests < ActiveRecord::Migration[8.1]
  def change
    add_column :leave_requests, :leave_slot, :integer, null: false, default: 0
    add_index :leave_requests, :leave_slot
  end
end
