class Todo < ApplicationRecord
  validate :due_is_valid_datetime

  def due_is_valid_datetime
    errors.add(:due, 'due must be a valid datetime') if ((DateTime.parse(due.to_s) rescue ArgumentError) == ArgumentError)
  end
end
