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

// Plafond par commande : 1 M$. Garde aussi base × taux bien sous Number.MAX_SAFE_INTEGER.
const MONTANT_MAX_CENTS = 100_000_000;

function verifierMontant(nom: string, montant: number): void {
  if (!Number.isInteger(montant)) {
    throw new Error(`${nom} doit être un entier en cents (reçu : ${montant})`);
  }
  if (montant < 0) {
    throw new Error(`${nom} ne peut pas être négatif (reçu : ${montant})`);
  }
  if (montant > MONTANT_MAX_CENTS) {
    throw new Error(`${nom} ne peut pas dépasser ${MONTANT_MAX_CENTS} cents (reçu : ${montant})`);
  }
}

// Le produit base × taux est un entier exact : une seule division, arrondie au cent le plus proche.
function calculerTaxe(base: number, taux: number): number {
  return Math.round((base * taux) / DENOMINATEUR);
}

export function calculerTaxes(sousTotalCents: number, rabaisCents = 0): Taxes {
  verifierMontant("sousTotalCents", sousTotalCents);
  verifierMontant("rabaisCents", rabaisCents);
  // Un rabais calculé par le serveur ne dépasse jamais le sous-total : sinon, c'est un bug.
  if (rabaisCents > sousTotalCents) {
    throw new Error("rabaisCents ne peut pas dépasser sousTotalCents");
  }

  const base = sousTotalCents - rabaisCents;
  // TPS et TVQ sont calculées toutes les deux sur la base : pas de TVQ sur la TPS.
  const tps = calculerTaxe(base, TPS_TAUX);
  const tvq = calculerTaxe(base, TVQ_TAUX);

  return { base, tps, tvq, total: base + tps + tvq };
}
