export function checkShanghai(turnHits, allowed = [1,2,3]) {
  if (!turnHits || turnHits.length < 3) return false;

  return allowed.every(hit => turnHits.includes(hit));
}
