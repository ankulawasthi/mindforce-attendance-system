class AddProfileFieldsToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :profile_photo_url, :string
    add_column :users, :mobile_number, :string
    add_column :users, :address, :text
    add_column :users, :emergency_contact, :string
    add_column :users, :personal_email, :string
    add_column :users, :shift_timing, :string
  end
end
