import { z } from "zod"

z.config(z.locales.fr());

const FORMAT_MONTANT = /^\d{1,6}([,.]\d{1,2})?$/

export function texteEnCents(texte: string): number{
    const [dollar, cents= ""] = texte.replace(",",".").split(".");
    return Number(dollar) * 100 + Number(cents.padEnd(2,"0")) // c'est pour respecter la taille d'une string, si ca match pas la taille 
    // voulu, alors on le remplace avec ce qu'on donne dans le deuxieme parametre,
}

const montantCent = z.string()
                    .trim()
                    .regex(FORMAT_MONTANT, {error: "Montant invalide : ecrivez sous format xx.yy $"})
                    .transform(texteEnCents)


export const nouvelEvenement = z.object({
    title: z.string().trim().min(5,{error:"titre a au moins 5 caracter"}).max(120),
    startsAt: z.coerce.date().refine((d)=> d > new Date(), {error: "La date doit etre dans le futur"}),
    location: z.string().trim().min(2).max(120),
    capacity: z.coerce.number().int().min(1).max(10_000,{error: "Capacite ne peut pas depasser 10000 places"}),
    price: montantCent,
    studentPrice : montantCent.optional(),
}).refine((p) => p.studentPrice === undefined || p.price > p.studentPrice, {error: "Le prix etudiant ne peut pas depasse le prix regulier"})

export type NouvelEvenementEntree = z.infer<typeof nouvelEvenement>
/*
 * z.infer<typeof nouvelEvenement>  -----> z.input <typeof nouvelEvenement> 
 *                                 |
 *                                  ----> z.output <typeof nouvelEvenement>
 * 
*/