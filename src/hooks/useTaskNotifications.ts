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
      const futureTasks = tasks.filter(task => {
        if (task.completed || !task.dueDate) return false;
        const dueTime = new Date(task.dueDate).getTime();
        return dueTime > now;
      });

      // 3. Schedule for each
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
