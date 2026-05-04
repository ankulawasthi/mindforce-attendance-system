class UpdateLeaveSlotEnum < ActiveRecord::Migration[8.1]
  def change
    change_column_default :leave_requests, :leave_slot, from: 0, to: 0
  end
end