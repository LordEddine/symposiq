---
name: revue-paiement
description: Relit les changements non commites lies au panier, au paiement, aux taxes ou aux webhooks Stripe et signale les violations des regles metiers de SymposiQ. A utiliser avant un commit qui touche a Stripe, les prix ou les commandes.
disable-model-invocation: true
allowed-tools: Read, Grep, autre au besoin. 
---

## Changements a relire
`git diff HEAD`

## Ce que tu dois verifier

Relit uniquement les changements ci-dessus (et les fichiers qu'ils touchent indirectement si necessaire)
Pour chaque point, reponds **OK**, **A CORRIGER** (avec le fichier et la ligne correspondante) ou **NON CONCERNE**:

1. **RM-13** : TPS 5 % et TVQ 9,975 % calculees sur le montant apres rabais, arrodies taxe par taxe ?
2. **RM-12** : le montant envoye a Stripe vient-il de la base de donnees, et jamais du formulaire ou de l'URL ?
3. **Argent** : tous les montants sont-ils des entiers positifs en cents (`Int`), sans `Float`, `Decimal` ni `parseFloat` ?
4. **RM-07** : Le prix et le nom de l'événement sont-ils copies dans `OrderITem` au moment de l'achat ?
5. **RM-14** : Un même événement Stripe (webhook) est-il deja traite ?
6. **RM-15** : une commande ne passe-t-elle a `PAID` que dans le webhook, apres verification de la signature ?
7. **Validation** : les entrees du client sont-elles validees cote serveur ?
8. **Secrets** : aucune cle, aucun `console.log(process.env)`, aucune numero de carte ?

Termine par un resume en une ligne : `X point A CORRIGER` 
Ne modifie aucun fichier, tu fais une revue, pas une correction.
Si le diff est vide, dis simplement qu'il n y a aucun changement a relire.