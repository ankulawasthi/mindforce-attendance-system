class AddJobTitleToUsers < ActiveRecord::Migration[7.0]
  def change
    add_column :users, :job_title, :string
  end

  def down
    remove_column :users, :job_title, :string if column_exists?(:users, :job_title)
  end
end
