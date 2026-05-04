require "test_helper"

class AttendanceTest < ActiveSupport::TestCase
  test "returns half_day when work seconds are below 7h50m" do
    below_threshold = (7.hours + 49.minutes + 59.seconds).to_i
    assert_equal :half_day, Attendance.status_for_work_seconds(below_threshold)
  end

  test "returns present when work seconds are at 7h50m threshold" do
    at_threshold = (7.hours + 50.minutes).to_i
    assert_equal :present, Attendance.status_for_work_seconds(at_threshold)
  end
end
