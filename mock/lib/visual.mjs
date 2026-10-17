// How-to-solve pictures as data. The backend (Go) will build the same shape (contracts/openapi.yaml, MethodVisual):
// a kind, integer params, one caption per step. The client draws and animates it. Built once per (kind, params, language).
const ones = (n) => Math.abs(n) % 10;

const KIND_OF = {
  'ARI-OPE-A02a': 'add_carry',
  'ARI-SEN-A01c': 'add_carry',
  'ARI-OPE-A03a': 'sub_borrow',
  'ARI-OPE-A06a': 'equal_groups',
  'ARI-SOP-A03a': 'equal_share',
};

/** MethodVisual for a skill and the numbers of one question, or undefined when no picture exists for the skill. */
export function visualFor(skillId, v, en) {
  const kind = KIND_OF[skillId];
  if (!kind) return undefined;
  const L = en ? 'en' : 'fr';
  const make = (params, caps, alt) => ({ kind, params, steps: caps.map((caption) => ({ caption })), alt, cache_key: `${kind}:${Object.values(params).join(',')}:${L}` });

  if (kind === 'add_carry') {
    const { a, b } = v, ua = ones(a), ub = ones(b), carry = ua + ub >= 10;
    return en
      ? make({ a, b }, [`Put the ones together: ${ua} and ${ub} make ${ua + ub}.`, carry ? 'Ten ones make one ten. Move it to the left.' : 'Nothing to regroup.', `In all: ${a + b}.`], `Blocks show ${a} plus ${b}. ${carry ? 'Ten ones become one ten. ' : ''}The total is ${a + b}.`)
      : make({ a, b }, [`On met les unités ensemble : ${ua} et ${ub} font ${ua + ub}.`, carry ? 'Dix unités font une dizaine. On la déplace à gauche.' : 'Rien à regrouper.', `Au total : ${a + b}.`], `Des blocs montrent ${a} plus ${b}. ${carry ? 'Dix unités deviennent une dizaine. ' : ''}Le total est ${a + b}.`);
  }
  if (kind === 'sub_borrow') {
    const { a, b } = v, ua = ones(a), ub = ones(b), borrow = ua < ub;
    return en
      ? make({ a, b }, [`Start with ${a}.`, borrow ? `${ua} ones are not enough to take away ${ub}. Break one ten into ten ones.` : 'Enough ones. Nothing to break.', `Take away ${b}. ${a - b} are left.`], `Blocks show ${a}. ${borrow ? 'One ten is broken into ten ones. ' : ''}Take away ${b}: ${a - b} are left.`)
      : make({ a, b }, [`On part de ${a}.`, borrow ? `${ua} unités, ce n’est pas assez pour en enlever ${ub}. On casse une dizaine en dix unités.` : 'Assez d’unités. Rien à casser.', `On enlève ${b}. Il reste ${a - b}.`], `Des blocs montrent ${a}. ${borrow ? 'Une dizaine est cassée en dix unités. ' : ''}On enlève ${b} : il reste ${a - b}.`);
  }
  if (kind === 'equal_groups') {
    const groups = v.b, size = v.a, total = groups * size;
    return en
      ? make({ groups, size }, [`${groups} groups.`, `${size} in each group.`, `${groups} groups of ${size} make ${total}.`], `${groups} groups of ${size} dots make ${total}.`)
      : make({ groups, size }, [`${groups} groupes.`, `${size} dans chaque groupe.`, `${groups} groupes de ${size} font ${total}.`], `${groups} groupes de ${size} points font ${total}.`);
  }
  const total = v.N, parts = v.k, q = Math.floor(total / parts);
  return en
    ? make({ total, parts }, [`We have ${total}.`, `Share them into ${parts} parts, one at a time.`, `Each part gets ${q}.`], `${total} dots are shared into ${parts} equal parts of ${q}.`)
    : make({ total, parts }, [`On a ${total}.`, `On partage en ${parts} parts, un à la fois.`, `Chaque part reçoit ${q}.`], `${total} points sont partagés en ${parts} parts égales de ${q}.`);
}
