require 'test_helper'

class UserSettingsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user_setting = user_settings(:one)
  end

  test "should get index" do
    get user_settings_url
    assert_response :success
  end

  test "should get new" do
    get new_user_setting_url
    assert_response :success
  end

  test "should create user_setting" do
    assert_difference('UserSetting.count') do
      post user_settings_url, params: { user_setting: { filter: @user_setting.filter, sort: @user_setting.sort, user_id: @user_setting.user_id } }
    end

    assert_redirected_to user_setting_url(UserSetting.last)
  end

  test "should show user_setting" do
    get user_setting_url(@user_setting)
    assert_response :success
  end

  test "should get edit" do
    get edit_user_setting_url(@user_setting)
    assert_response :success
  end

  test "should update user_setting" do
    patch user_setting_url(@user_setting), params: { user_setting: { filter: @user_setting.filter, sort: @user_setting.sort, user_id: @user_setting.user_id } }
    assert_redirected_to user_setting_url(@user_setting)
  end

  test "should destroy user_setting" do
    assert_difference('UserSetting.count', -1) do
      delete user_setting_url(@user_setting)
    end

    assert_redirected_to user_settings_url
  end
end
