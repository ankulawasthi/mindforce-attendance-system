class MakeEmployeeIdMandatory < ActiveRecord::Migration[8.1]
  def change
    add_index :users, :employee_id, unique: true, if_not_exists: true
  end
end