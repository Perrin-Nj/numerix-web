import type { FieldErrors, FieldValues, Resolver } from 'react-hook-form';

/** One rule per field: return an error message, or null when the value is fine. Replaces zod on form screens (about 100 KB less JavaScript). */
export function rulesResolver<V extends FieldValues>(rules: { [K in keyof V]?: (value: V[K]) => string | null }): Resolver<V> {
  return async (values) => {
    const errors: Record<string, { type: string; message: string }> = {};
    for (const name of Object.keys(rules) as (keyof V & string)[]) {
      const message = rules[name]?.(values[name]);
      if (message) errors[name] = { type: 'validate', message };
    }
    return Object.keys(errors).length ? { values: {}, errors: errors as FieldErrors<V> } : { values, errors: {} };
  };
}

/** Same shape check as zod's email: something@something.tld, no spaces. */
export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
