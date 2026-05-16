class AddEmploymentTypeAndWorkModeToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :employment_type, :string
    add_column :users, :work_mode, :string
  end
end
