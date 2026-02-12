
const TELEGRAM_TOKEN = '8104193807:AAGOiRCU325eep22zI5lr2ozc11hcd4Flb8';

export async function sendPhotoToTelegram(photoBlob: Blob, chatId: string, caption: string) {
  const formData = new FormData();
  formData.append('chat_id', chatId);
  formData.append('photo', photoBlob, 'love-strip.png');
  formData.append('caption', caption);

  console.log(`Telegram Service: Sending ${photoBlob.size} byte blob to chat ${chatId}`);

  const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Telegram API error details:', errorData);

    if (errorData.description?.includes('supergroup chat') && errorData.parameters?.migrate_to_chat_id) {
      const newId = errorData.parameters.migrate_to_chat_id;
      throw new Error(`CRITICAL: Telegram Group Migrated! Your old ID is dead. Please use the NEW ID: ${newId}. Update this in PhotoStrip.tsx.`);
    }

    throw new Error(`Telegram API Error: ${errorData.description || response.statusText}`);
  }

  return response.json();
}
