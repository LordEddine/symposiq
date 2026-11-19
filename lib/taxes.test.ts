import { describe, expect, it } from "vitest";
import { calculerTaxes } from "./taxes";

// Référence indépendante en BigInt : arrondi au cent le plus proche, ,5 vers le haut.
// (BigInt(...) plutôt que 5n : la cible TypeScript est ES2017.)
function taxeReference(base: number, numerateur: number, denominateur: number): number {
  const num = BigInt(numerateur);
  const den = BigInt(denominateur);
  const deux = BigInt(2);
  return Number((deux * BigInt(base) * num + den) / (deux * den));
}

function reference(base: number) {
  const tps = taxeReference(base, 5, 100); // 5 %
  const tvq = taxeReference(base, 9975, 100_000); // 9,975 %
  return { base, tps, tvq, total: base + tps + tvq };
}

describe("calculerTaxes (RM-13)", () => {
  it("billet régulier : 4000 → total 4599", () => {
    expect(calculerTaxes(4000)).toEqual({ base: 4000, tps: 200, tvq: 399, total: 4599 });
  });

  it("billet étudiant : 2000 → total 2300 (TVQ 199,5 arrondie à 200)", () => {
    expect(calculerTaxes(2000)).toEqual({ base: 2000, tps: 100, tvq: 200, total: 2300 });
  });

  it("plan Pro : 2900 → total 3334", () => {
    expect(calculerTaxes(2900)).toEqual({ base: 2900, tps: 145, tvq: 289, total: 3334 });
  });

  it("0 → total 0", () => {
    expect(calculerTaxes(0)).toEqual({ base: 0, tps: 0, tvq: 0, total: 0 });
  });

  it("4000 avec rabais de 1000 → base 3000, total 3449", () => {
    expect(calculerTaxes(4000, 1000)).toEqual({ base: 3000, tps: 150, tvq: 299, total: 3449 });
  });

  it("la TVQ n'est pas calculée sur la TPS", () => {
    const { tvq } = calculerTaxes(4000);
    // TVQ sur la base seule : 4000 × 9,975 % = 399 ; sur base + TPS : 4200 × 9,975 % = 419.
    expect(tvq).toBe(399);
    expect(tvq).not.toBe(419);
  });

  it("montant négatif → erreur", () => {
    expect(() => calculerTaxes(-100)).toThrow(/sousTotalCents.*négatif/);
  });

  it("montant non entier → erreur", () => {
    expect(() => calculerTaxes(40.5)).toThrow(/sousTotalCents.*entier/);
  });

  it("NaN ou Infinity → erreur", () => {
    expect(() => calculerTaxes(NaN)).toThrow(/sousTotalCents.*entier/);
    expect(() => calculerTaxes(Infinity)).toThrow(/sousTotalCents.*entier/);
    expect(() => calculerTaxes(-Infinity)).toThrow(/sousTotalCents.*entier/);
  });

  it("montant en chaîne → erreur", () => {
    // Une valeur de formulaire non convertie ne doit jamais passer (RM-12).
    expect(() => calculerTaxes("4000" as unknown as number)).toThrow(/sousTotalCents.*entier/);
  });

  it("montant null ou undefined → erreur", () => {
    expect(() => calculerTaxes(null as unknown as number)).toThrow(/sousTotalCents.*entier/);
    expect(() => calculerTaxes(undefined as unknown as number)).toThrow(/sousTotalCents.*entier/);
  });

  it("rabais négatif, non entier, NaN ou null → erreur", () => {
    expect(() => calculerTaxes(4000, -100)).toThrow(/rabaisCents.*négatif/);
    expect(() => calculerTaxes(4000, 10.5)).toThrow(/rabaisCents.*entier/);
    expect(() => calculerTaxes(4000, NaN)).toThrow(/rabaisCents.*entier/);
    expect(() => calculerTaxes(4000, null as unknown as number)).toThrow(/rabaisCents.*entier/);
  });

  it("rabais undefined → aucun rabais", () => {
    expect(calculerTaxes(4000, undefined)).toEqual(calculerTaxes(4000));
  });

  it("rabais égal au sous-total → total 0", () => {
    expect(calculerTaxes(4000, 4000)).toEqual({ base: 0, tps: 0, tvq: 0, total: 0 });
  });

  it("rabais supérieur au sous-total → erreur", () => {
    expect(() => calculerTaxes(2000, 2001)).toThrow(/rabaisCents ne peut pas dépasser sousTotalCents/);
    expect(() => calculerTaxes(2000, 5000)).toThrow(/rabaisCents ne peut pas dépasser sousTotalCents/);
  });

  it("sous-total au plafond de 1 M$ → accepté", () => {
    expect(calculerTaxes(100_000_000)).toEqual({
      base: 100_000_000,
      tps: 5_000_000,
      tvq: 9_975_000,
      total: 114_975_000,
    });
  });

  it("sous-total au-delà du plafond de 1 M$ → erreur", () => {
    expect(() => calculerTaxes(100_000_001)).toThrow(/sousTotalCents.*dépasser/);
    expect(() => calculerTaxes(Number.MAX_SAFE_INTEGER)).toThrow(/sousTotalCents.*dépasser/);
    expect(() => calculerTaxes(1e300)).toThrow(/sousTotalCents.*dépasser/);
  });

  it("TPS à ,5 cent arrondie vers le haut : 30 → TPS 1,5 arrondie à 2", () => {
    expect(calculerTaxes(30)).toEqual({ base: 30, tps: 2, tvq: 3, total: 35 });
  });

  it("TPS juste sous ,5 cent arrondie vers le bas : 9 → TPS 0,45 arrondie à 0", () => {
    expect(calculerTaxes(9)).toEqual({ base: 9, tps: 0, tvq: 1, total: 10 });
  });

  it("TVQ à ,5 cent arrondie vers le haut : 6000 → TVQ 598,5 arrondie à 599", () => {
    expect(calculerTaxes(6000)).toEqual({ base: 6000, tps: 300, tvq: 599, total: 6899 });
  });

  it("identique à la référence BigInt pour toute base de 0 à 10 000 cents", () => {
    const ecarts = [];
    for (let base = 0; base <= 10_000; base++) {
      const obtenu = calculerTaxes(base);
      const attendu = reference(base);
      if (obtenu.tps !== attendu.tps || obtenu.tvq !== attendu.tvq || obtenu.total !== attendu.total) {
        ecarts.push({ base, obtenu, attendu });
      }
    }
    expect(ecarts).toEqual([]);
  });

  it("avec rabais : taxes de la référence sur sous-total − rabais", () => {
    const cas: [number, number][] = [[4000, 1000], [2999, 1], [123457, 3000], [10, 9]];
    for (const [sousTotal, rabais] of cas) {
      expect(calculerTaxes(sousTotal, rabais)).toEqual(reference(sousTotal - rabais));
    }
  });
});
