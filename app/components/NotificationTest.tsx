import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { notificationService } from '@/services/notificationService';
import { useAuth } from '@/contexts/AuthContext';

export function NotificationTest() {
  const { user } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkNotificationStatus();
  }, []);

  const checkNotificationStatus = async () => {
    try {
      const enabled = await notificationService.areNotificationsEnabled();
      setNotificationsEnabled(enabled);
      
      const token = await notificationService.getStoredToken();
      setPushToken(token);
    } catch (error) {
      console.error('Error checking notification status:', error);
    }
  };

  const requestPermissions = async () => {
    setLoading(true);
    try {
      const token = await notificationService.requestPermissions();
      if (token) {
        setPushToken(token);
        setNotificationsEnabled(true);
        
        // Register with backend if user is logged in
        if (user?.id) {
          await notificationService.registerWithBackend(user.id);
        }
        
        Alert.alert('Success', 'Notifications enabled successfully!');
      } else {
        Alert.alert('Error', 'Failed to enable notifications. Please check your device settings.');
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      Alert.alert('Error', 'Failed to enable notifications.');
    } finally {
      setLoading(false);
    }
  };

  const testLocalNotification = async () => {
    try {
      await notificationService.scheduleLocalNotification(
        'Test Notification',
        'This is a test notification from Smashd!',
        { type: 'test' }
      );
      Alert.alert('Success', 'Test notification scheduled!');
    } catch (error) {
      console.error('Error scheduling test notification:', error);
      Alert.alert('Error', 'Failed to schedule test notification.');
    }
  };

  return (
    <View className="bg-white p-4 rounded-lg shadow-sm mb-4">
      <Text className="text-lg font-bold mb-4">🔔 Notification Settings</Text>
      
      <View className="space-y-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-gray-700">Status:</Text>
          <Text className={`font-semibold ${notificationsEnabled ? 'text-green-600' : 'text-red-600'}`}>
            {notificationsEnabled ? '✅ Enabled' : '❌ Disabled'}
          </Text>
        </View>

        {pushToken && (
          <View>
            <Text className="text-gray-700 mb-1">Push Token:</Text>
            <Text className="text-xs text-gray-500 bg-gray-100 p-2 rounded">
              {pushToken.substring(0, 50)}...
            </Text>
          </View>
        )}

        <View className="space-y-2 mt-4">
          {!notificationsEnabled && (
            <Pressable
              onPress={requestPermissions}
              disabled={loading}
              className={`bg-blue-500 p-3 rounded-lg ${loading ? 'opacity-50' : ''}`}
            >
              <Text className="text-white text-center font-semibold">
                {loading ? 'Enabling...' : 'Enable Notifications'}
              </Text>
            </Pressable>
          )}

          {notificationsEnabled && (
            <Pressable
              onPress={testLocalNotification}
              className="bg-green-500 p-3 rounded-lg"
            >
              <Text className="text-white text-center font-semibold">
                Test Notification
              </Text>
            </Pressable>
          )}

          <Pressable
            onPress={checkNotificationStatus}
            className="bg-gray-500 p-3 rounded-lg"
          >
            <Text className="text-white text-center font-semibold">
              Refresh Status
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
} 