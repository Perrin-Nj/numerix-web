// Solves the server's math_text formats so tests can answer correctly without the server leaking answers.
export function solve(mathText) {
  const t = mathText.replace(/\s+/g, ' ').trim();
  let m;
  if ((m = /^(\d+) \+ \? = (\d+)/.exec(t))) return Number(m[2]) - Number(m[1]);
  if ((m = /^(\d+) \+ (\d+) = \?/.exec(t))) return Number(m[1]) + Number(m[2]);
  if ((m = /^(\d+) [−-] (\d+) = \?/.exec(t))) return Number(m[1]) - Number(m[2]);
  if ((m = /^(\d+) × (\d+)/.exec(t))) return Number(m[1]) * Number(m[2]);
  if ((m = /^(\d+) ÷ (\d+) = \? \((avec reste|with remainder)\)/.exec(t))) return [Math.floor(Number(m[1]) / Number(m[2])), Number(m[1]) % Number(m[2])];
  if ((m = /^(\d+) ÷ (\d+)/.exec(t))) return Math.floor(Number(m[1]) / Number(m[2]));
  throw new Error(`cannot solve: ${mathText}`);
}

/** A choice that is certainly not the correct one. */
export function wrong(choices, correct) {
  return choices.find((c) => JSON.stringify(c) !== JSON.stringify(correct));
}
