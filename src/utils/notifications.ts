import { LocalNotifications } from "@capacitor/local-notifications";
import { toast } from "sonner";

export class NotificationManager {
  static async createChannels() {
    try {
      await LocalNotifications.createChannel({
        id: "omit-notifications",
        name: "Omit Notifications",
        description: "Notifications for tasks and focus sessions",
        importance: 5, // high/max importance
        visibility: 1, // public
        vibration: true,
      });
      console.log("Notification channel created");
      return true;
    } catch (error) {
      console.error("Failed to create notification channel:", error);
      return false;
    }
  }

  static async requestPermissions() {
    try {
      const perms = await LocalNotifications.checkPermissions();
      console.log("Current permissions:", perms);

      if (perms.display !== "granted") {
        const result = await LocalNotifications.requestPermissions();
        console.log("Permission request result:", result);
        const granted = result.display === "granted";
        if (granted) {
          await this.createChannels();
          toast.success("Notification permissions granted!");
        } else {
          console.log("Notification permissions denied.");
        }
        return granted;
      }

      await this.createChannels();
      return true;
    } catch (error) {
      console.error("Failed to request notification permissions:", error);
      toast.error("Error requesting notifications: " + error);
      return false;
    }
  }

  static async scheduleFocusEnd(durationMinutes: number) {
    try {
      const granted = await this.requestPermissions();
      if (!granted) return false;

      // Bug 21 fix: Only cancel focus-related notifications, not task reminders
      await LocalNotifications.cancel({
        notifications: [{ id: 1001 }, { id: 2000 }],
      });

      const scheduledTime = new Date(Date.now() + durationMinutes * 60 * 1000);
      console.log("Scheduling Focus End for:", scheduledTime);

      await LocalNotifications.schedule({
        notifications: [
          {
            title: "Focus Session Complete",
            body: "Great job! You have completed your focus session.",
            id: 1001,
            schedule: { at: scheduledTime, allowWhileIdle: true },
            channelId: "omit-notifications",
          },
        ],
      });

      toast.info(`Notification scheduled for ${durationMinutes}m from now`);
      return true;
    } catch (error) {
      console.error("Failed to schedule notification:", error);
      toast.error("Failed to schedule: " + error);
      return false;
    }
  }

  static async updateRemainingTime(seconds: number) {
    try {
      const minutes = Math.ceil(seconds / 60);
      const id = 2000; // Fixed ID for remaining time notification

      await LocalNotifications.schedule({
        notifications: [
          {
            title: "Focus Session Active",
            body: `${minutes} ${
              minutes === 1 ? "minute" : "minutes"
            } remaining`,
            id: id,
            schedule: { at: new Date(Date.now() + 100), allowWhileIdle: true },
            ongoing: true, // Android persistent notification
            autoCancel: false,
            channelId: "omit-notifications",
          },
        ],
      });
    } catch (error) {
      console.error("Failed to update remaining time notification:", error);
    }
  }

  static async cancelRemainingTime() {
    try {
      await LocalNotifications.cancel({ notifications: [{ id: 2000 }] });
    } catch (error) {
      console.error("Failed to cancel remaining time notification:", error);
    }
  }

  static async sendInstantNotification(title: string, body: string) {
    try {
      const granted = await this.requestPermissions();
      if (!granted) return;

      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id: Math.floor(Math.random() * 100000) + 2000,
            schedule: { at: new Date(Date.now() + 1000), allowWhileIdle: true },
            channelId: "omit-notifications",
            sound: "res://platform_default",
          },
        ],
      });
      console.log("Instant notification sent");
    } catch (error) {
      console.error("Failed to send instant notification:", error);
      toast.error("Instant notification error: " + error);
    }
  }

  static async scheduleTaskNotification(task: {
    id: string;
    title: string;
    dueDate: string;
    priority?: string;
  }) {
    try {
      const granted = await this.requestPermissions();
      if (!granted) return false;

      const scheduledTime = new Date(task.dueDate);
      if (scheduledTime.getTime() <= Date.now()) return false;

      // Bug 5 fix: Use FNV-1a hash for collision-resistant IDs instead of char code sum
      const fnvHash = (str: string): number => {
        let hash = 0x811c9dc5;
        for (let i = 0; i < str.length; i++) {
          hash ^= str.charCodeAt(i);
          hash = (hash * 0x01000193) >>> 0;
        }
        return hash;
      };
      const uniqueId = (fnvHash(task.id) % 90000) + 5000;
      console.log(
        `Scheduling Task Reminder (${task.title}) at:`,
        scheduledTime,
      );

      await LocalNotifications.schedule({
        notifications: [
          {
            title:
              task.priority === "high"
                ? "🔥 Important Task Due"
                : "Task Reminder",
            body: `Don't forget: ${task.title}`,
            id: uniqueId,
            schedule: { at: scheduledTime, allowWhileIdle: true },
            channelId: "omit-notifications",
            extra: { taskId: task.id },
          },
        ],
      });
      return true;
    } catch (error) {
      console.error("Failed to schedule task notification:", error);
      toast.error("Task reminder error: " + error);
      return false;
    }
  }

  static async cancelTaskNotifications() {
    try {
      const pending = await LocalNotifications.getPending();
      // Only cancel notifications in the task ID range (5000-95000)
      const taskNotifications = pending.notifications.filter(
        (n) => n.id >= 5000 && n.id < 95000,
      );
      if (taskNotifications.length > 0) {
        await LocalNotifications.cancel({ notifications: taskNotifications });
      }
    } catch (error) {
      console.error("Failed to cancel task notifications:", error);
    }
  }

  static async cancelAll() {
    try {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel(pending);
      }
    } catch (error) {
      console.error("Failed to cancel notifications:", error);
    }
  }
}
