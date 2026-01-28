import { LocalNotifications } from '@capacitor/local-notifications';

export class NotificationManager {
  static async requestPermissions() {
    try {
      const result = await LocalNotifications.requestPermissions();
      return result.display === 'granted';
    } catch (error) {
      console.error('Failed to request notification permissions:', error);
      return false;
    }
  }

  static async scheduleFocusEnd(durationMinutes: number) {
    try {
      // Cancel any existing notifications properly
      await this.cancelAll();

      const scheduledTime = new Date(Date.now() + durationMinutes * 60 * 1000);

      await LocalNotifications.schedule({
        notifications: [
          {
            title: 'Focus Session Complete',
            body: 'Great job! You have completed your focus session.',
            id: 1001,
            schedule: { at: scheduledTime },
            sound: 'res://platform_default',
            smallIcon: 'ic_stat_icon_config_sample', // Default fallback
            actionTypeId: '',
            extra: null
          }
        ]
      });
      return true;
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      return false;
    }
  }

  static async sendInstantNotification(title: string, body: string) {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id: Math.floor(Math.random() * 100000) + 2000,
            schedule: { at: new Date(Date.now() + 1000) }, // 1 second delay
            sound: 'res://platform_default',
          }
        ]
      });
    } catch (error) {
      console.error('Failed to send instant notification:', error);
    }
  }

  static async scheduleTaskNotification(task: { id: string, title: string, dueDate: string, priority?: string }) {
    try {
      const scheduledTime = new Date(task.dueDate);
      if (scheduledTime.getTime() <= Date.now()) return false;

      // Generate a unique numeric ID from the string ID for simpler management
      // Simple hash to int
      const uniqueId = task.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + 5000;

      await LocalNotifications.schedule({
        notifications: [
          {
            title: task.priority === 'high' ? '🔥 Important Task Due' : 'Task Reminder',
            body: `Don't forget: ${task.title}`,
            id: uniqueId,
            schedule: { at: scheduledTime },
            sound: 'res://platform_default',
            smallIcon: 'ic_stat_icon_config_sample',
            extra: { taskId: task.id }
          }
        ]
      });
      return true;
    } catch (error) {
      console.error('Failed to schedule task notification:', error);
      return false;
    }
  }

  static async cancelAll() {
    try {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel(pending);
      }
    } catch (error) {
      console.error('Failed to cancel notifications:', error);
    }
  }
}
