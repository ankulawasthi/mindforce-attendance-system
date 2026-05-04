class CreateDepartments < ActiveRecord::Migration[8.1]
  def change
    create_table :departments do |t|
      t.string :name, null: false
      t.integer :manager_id

      t.timestamps
    end

    add_index :departments, :name, unique: true
    add_index :departments, :manager_id
  end
end