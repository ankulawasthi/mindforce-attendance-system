class AddIsExceededToBreaks < ActiveRecord::Migration[8.1]
  def change
    add_column :breaks, :is_exceeded, :boolean
  end
end
