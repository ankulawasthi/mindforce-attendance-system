class AddReasonToBreaks < ActiveRecord::Migration[8.1]
  def change
    add_column :breaks, :reason, :text
  end
end
