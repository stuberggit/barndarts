export function checkShanghai(turnHits) {
  if (!turnHits || turnHits.length < 3) return false;

  return (
    turnHits.includes(1) &&
    turnHits.includes(2) &&
    turnHits.includes(3)
  );
}
