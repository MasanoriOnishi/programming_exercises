class Todo < ApplicationRecord
  validate :due_is_valid_datetime, :task_is_presence

  def due_is_valid_datetime
    errors.add(:due, 'due must be a valid datetime') if ((DateTime.parse(due.to_s) rescue ArgumentError) == ArgumentError)
  end

  def task_is_presence
    errors.add(:task, 'task can\'t be blank') if task.blank?
  end
end
