import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import api from './api';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

class NotificationService {
  private pushToken: string | null = null;
  private notificationListener: any = null;
  private responseListener: any = null;

  /**
   * Initialize the notification service
   */
  async initialize() {
    try {
      // Set up notification listeners
      this.setupNotificationListeners();
      
      // Request permissions and get token
      await this.requestPermissions();
      
      console.log('📱 Notification service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize notification service:', error);
    }
  }

  /**
   * Request notification permissions and get push token
   */
  async requestPermissions(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        console.warn('📱 Push notifications only work on physical devices');
        return null;
      }

      // Check existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permissions if not granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('📱 Notification permissions not granted');
        return null;
      }

      // Get the push token
      const projectId = Constants.expoConfig?.extra?.eas?.projectId || '36b14cff-7f2e-43ac-9da6-f163563fd773';
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      });

      this.pushToken = token.data;
      await AsyncStorage.setItem('pushToken', this.pushToken);
      
      console.log('📱 Push token obtained:', this.pushToken);
      return this.pushToken;

    } catch (error) {
      console.error('❌ Error getting push token:', error);
      return null;
    }
  }

  /**
   * Register push token with backend
   */
  async registerWithBackend(userId?: number): Promise<void> {
    try {
      if (!this.pushToken) {
        console.warn('📱 No push token available to register');
        return;
      }

      if (!userId) {
        console.warn('📱 No user ID provided for token registration');
        return;
      }

      await api.post(`/v1/notifications/users/${userId}/push-token`, {
        pushToken: this.pushToken
      });

      console.log('✅ Push token registered with backend');
    } catch (error) {
      console.error('❌ Failed to register push token with backend:', error);
    }
  }

  /**
   * Remove push token from backend
   */
  async unregisterFromBackend(userId?: number): Promise<void> {
    try {
      if (!userId) {
        console.warn('📱 No user ID provided for token removal');
        return;
      }

      await api.delete(`/v1/notifications/users/${userId}/push-token`);
      console.log('✅ Push token removed from backend');
    } catch (error) {
      console.error('❌ Failed to remove push token from backend:', error);
    }
  }

  /**
   * Set up notification listeners
   */
  private setupNotificationListeners() {
    // Listener for notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('📱 Notification received:', notification);
      
      // You can add custom handling here
      // For example, update app state, show custom UI, etc.
    });

    // Listener for when user taps on notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('📱 Notification response:', response);
      
      const data = response.notification.request.content.data;
      this.handleNotificationResponse(data);
    });
  }

  /**
   * Handle notification tap/response
   */
  private handleNotificationResponse(data: any) {
    try {
      if (data.type === 'order_update' && data.orderId) {
        // Navigate to order details
        console.log('📱 Navigating to order:', data.orderId);
        // You can use your navigation here
        // NavigationService.navigate('OrderDetails', { orderId: data.orderId });
      } else if (data.type === 'new_order' && data.orderId) {
        // Navigate to admin panel (if user is admin)
        console.log('📱 Navigating to admin for order:', data.orderId);
        // NavigationService.navigate('AdminOrders');
      } else if (data.type === 'promotional') {
        // Navigate to promotions or deals
        console.log('📱 Navigating to promotions');
        // NavigationService.navigate('Promotions');
      }
    } catch (error) {
      console.error('❌ Error handling notification response:', error);
    }
  }

  /**
   * Get stored push token
   */
  async getStoredToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('pushToken');
    } catch (error) {
      console.error('❌ Error getting stored push token:', error);
      return null;
    }
  }

  /**
   * Clear stored push token
   */
  async clearStoredToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem('pushToken');
      this.pushToken = null;
    } catch (error) {
      console.error('❌ Error clearing stored push token:', error);
    }
  }

  /**
   * Check if notifications are enabled
   */
  async areNotificationsEnabled(): Promise<boolean> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('❌ Error checking notification permissions:', error);
      return false;
    }
  }

  /**
   * Schedule a local notification (for testing)
   */
  async scheduleLocalNotification(title: string, body: string, data?: any) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
        },
        trigger: null,
      });
      console.log('📱 Local notification scheduled');
    } catch (error) {
      console.error('❌ Error scheduling local notification:', error);
    }
  }

  /**
   * Clean up listeners
   */
  cleanup() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService(); 