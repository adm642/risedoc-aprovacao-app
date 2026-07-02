/** Concordância simples de número: plural(1, "post") → "1 post"; plural(3, "post") → "3 posts". */
export function plural(n: number, singular: string, pluralForm?: string): string {
  const word = n === 1 ? singular : pluralForm ?? `${singular}s`;
  return `${n} ${word}`;
}
