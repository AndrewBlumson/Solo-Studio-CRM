export function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function isoToday(): string {
  return dateKey(new Date());
}

export function offsetDate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return dateKey(date);
}