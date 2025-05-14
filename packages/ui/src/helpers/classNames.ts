/**
 * Function used for adding a big number of classes used with Tailwind
 * and with sticking to the max length of a line rule.
 * Also can be used to have some conditional classNames by including
 * falsy params that will be ignored. i.e. `..., 1 == 2 && "bg-red-500"`
 *
 * @param {string[]} classNames List of strings or falsy params
 * @returns Concatenated classnames
 */
export default function cl(...classNames: (string | boolean | undefined)[]): string {
  return classNames.filter(Boolean).join(' ');
}
