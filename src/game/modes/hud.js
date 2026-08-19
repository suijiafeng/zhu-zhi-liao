export function baseHud(S) {
  return {
    score: S.score,
    combo: S.combo,
    shield: S.shield,
    fever: S.fever > 0,
    fly: S.flyCharge >= 100 && S.flight === 0 && S.broken === 0,
  }
}
