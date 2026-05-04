class CreateUsers < ActiveRecord::Migration[8.1]
  def change
    create_table :users do |t|
      t.string :name, null: false
      t.string :email, null: false
      t.string :password_digest, null: false
      t.integer :role, null: false, default: 2
      t.integer :department_id
      t.boolean :is_active, null: false, default: true
      t.date :joined_at

      t.timestamps
    end

    add_index :users, :email, unique: true
    add_index :users, :department_id
    add_index :users, :role
  end
end