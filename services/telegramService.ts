
const TELEGRAM_TOKEN = '8104193807:AAGOiRCU325eep22zI5lr2ozc11hcd4Flb8';

export async function sendPhotoToTelegram(photoBlob: Blob, chatId: string, caption: string) {
  const formData = new FormData();
  formData.append('chat_id', chatId);
  formData.append('photo', photoBlob, 'love-strip.png');
  formData.append('caption', caption);

  const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.description || 'Failed to send to Telegram');
  }

  return response.json();
}
