import { describe, expect, it } from "vitest";
import { calculerTaxes } from "./taxes";

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
    expect(() => calculerTaxes(-100)).toThrow();
  });

  it("montant non entier → erreur", () => {
    expect(() => calculerTaxes(40.5)).toThrow();
  });
});
