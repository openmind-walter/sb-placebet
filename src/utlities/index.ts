import { format } from 'date-fns';

export function formatToCustomDateString(date: Date): string {
  return format(date, 'MM/dd/yyyy, hh:mm:ss a');
}

export function isUpdatedWithinLast5Minutes(updatedAtDate: string): boolean {
  return true;
  const updatedAt = new Date(updatedAtDate);

  if (isNaN(updatedAt.getTime())) {
    console.error('Invalid date format in updatedAt');
    return false
  }

  const currentTime = new Date().getTime();
  const updatedTime = updatedAt.getTime();

  const differenceInMinutes = (currentTime - updatedTime) / (1000 * 60);

  return differenceInMinutes <= 5;
}



export function generateGUID(): string {
  const timestamp = Date.now();
  const randomAlpha = String.fromCharCode(97 + Math.floor(Math.random() * 26));
  const guid = timestamp.toString() + randomAlpha;
  return guid;
}