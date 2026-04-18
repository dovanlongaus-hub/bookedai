export function cx(...classNames: Array<string | undefined | null | false>) {
  return classNames.filter(Boolean).join(' ');
}
