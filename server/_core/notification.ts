/**
 * Notification stub — replace with your own notification service
 * (e.g., email via SendGrid, Slack webhook, etc.)
 */

export type NotificationPayload = {
  title: string;
  content: string;
};

/**
 * Send a notification. Currently logs to console.
 * Replace with your preferred notification channel.
 */
export async function notifyOwner(
  payload: NotificationPayload
): Promise<boolean> {
  console.log(`[Notification] ${payload.title}: ${payload.content}`);
  return true;
}
