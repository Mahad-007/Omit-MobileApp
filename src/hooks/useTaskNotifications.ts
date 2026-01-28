import { useEffect } from 'react';
import { useTasks } from '@/lib/api';
import { storage } from '@/lib/storage';
import { NotificationManager } from '@/utils/notifications';

export function useTaskNotifications() {
  const { data: tasks = [] } = useTasks();

  useEffect(() => {
    const settings = storage.getSettings();
    if (!settings.taskReminders) return;

    const scheduleNotifications = async () => {
      // 1. Request permissions
      await NotificationManager.requestPermissions();
      
      // 2. Filter for future tasks
      const now = Date.now();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayStartTime = todayStart.getTime();

      const futureTasks = tasks.filter(task => {
        if (task.completed || !task.dueDate) return false;
        const dueTime = new Date(task.dueDate).getTime();
        return dueTime > now;
      });

      // 3. Check for overdue tasks (past due, not today, not completed)
      const overdueTasks = tasks.filter(task => {
        if (task.completed || !task.dueDate) return false;
        const dueTime = new Date(task.dueDate).getTime();
        return dueTime < now && dueTime < todayStartTime;
      });

      if (overdueTasks.length > 0) {
        const lastNotified = sessionStorage.getItem('last_overdue_notify');
        const todayStr = new Date().toDateString();
        
        if (lastNotified !== todayStr) {
          await NotificationManager.sendInstantNotification(
            "Missed Tasks", 
            `You have ${overdueTasks.length} overdue tasks waiting for you.`
          );
          sessionStorage.setItem('last_overdue_notify', todayStr);
        }
      }

      // 4. Schedule future notifications
      for (const task of futureTasks) {
        if (task.dueDate) {
             await NotificationManager.scheduleTaskNotification({
                id: task.id,
                title: task.title,
                dueDate: task.dueDate,
                priority: task.priority
             });
        }
      }
    };

    scheduleNotifications();
  }, [tasks]);
}
