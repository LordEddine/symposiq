// Calcul des taxes québécoises (RM-13).
// Tous les montants sont des entiers en cents.

export type Taxes = {
  base: number;
  tps: number;
  tvq: number;
  total: number;
};

// Taux exprimés en cent-millièmes pour garder des entiers : 5 % = 5000, 9,975 % = 9975.
const TPS_TAUX = 5000;
const TVQ_TAUX = 9975;
const DENOMINATEUR = 100_000;

function verifierMontant(nom: string, montant: number): void {
  if (!Number.isInteger(montant)) {
    throw new Error(`${nom} doit être un entier en cents (reçu : ${montant})`);
  }
  if (montant < 0) {
    throw new Error(`${nom} ne peut pas être négatif (reçu : ${montant})`);
  }
}

// Le produit base × taux est un entier exact : une seule division, arrondie au cent le plus proche.
function calculerTaxe(base: number, taux: number): number {
  return Math.round((base * taux) / DENOMINATEUR);
}

export function calculerTaxes(sousTotalCents: number, rabaisCents = 0): Taxes {
  verifierMontant("sousTotalCents", sousTotalCents);
  verifierMontant("rabaisCents", rabaisCents);

  const base = Math.max(0, sousTotalCents - rabaisCents);
  // TPS et TVQ sont calculées toutes les deux sur la base : pas de TVQ sur la TPS.
  const tps = calculerTaxe(base, TPS_TAUX);
  const tvq = calculerTaxe(base, TVQ_TAUX);

  return { base, tps, tvq, total: base + tps + tvq };
}
