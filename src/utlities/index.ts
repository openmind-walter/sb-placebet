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


export function formatString(input: string): string {
  if (!input) return input
  const trimmedString = input.trim();
  const escapedString = trimmedString.replace(/'/g, "''");
  const formattedString = '' + `${escapedString}`;
  return formattedString;
}

export function generateGUID(): string {
  return 'xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}