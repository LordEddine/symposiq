import { z } from "zod";
import { Role } from "../generated/prisma/enums";

function essayer(nom: string, schema: z.ZodType, valeur: unknown){
    // safeParse ne lance jamais d'exception ! il renvoie toujours un objet { success, ....}
    // Parse ca lance des exceptions et annule toute l'operation
    const resultat = schema.safeParse(valeur);

    const entree = JSON.stringify(valeur) ?? String(valeur);
    if (resultat.success){
        console.log(`  Fait ! ${nom} ${entree} -> ${JSON.stringify(resultat.data)}`)
    }else{
        const message = resultat.error.issues.map((p) => p.message).join(" | ");
        console.log(`  Echoue ! ${nom} ${entree} -> ${message}`)
    }
}

const section = (titre : string) => console.log(`\n${titre}`); // decoratif pour l'affichage
// exprience 1 : pour le test
section("1. parse ou safeParse");

try{ // dans le cas de parse
    z.string().parse(42);
}catch(erreur){
    console.log(" parse(42) a lance une exception :", erreur instanceof z.ZodError)
}
// dans le cas de safeParse
console.log(" safeParse(42) renvoie :", JSON.stringify(z.string().safeParse(42).success))

// experience 2 : essai sur les types de base
section("2. Les types de base");
essayer("z.string() avec un texte",z.string(),"symposiq");
essayer("z.string() avec un number",z.string(), 42);
essayer("z.number() avec un texte", z.number(), "80");
essayer("z.boolean() avec oui", z.boolean(), true);// a revoir pour "oui" / 1
essayer("z.string() avec rien", z.string() , undefined);

// experiece 3 : personnalise les messages
section("3. Regles et messages")
const titre = z
                .string()
                .trim()
                .min(5, { error: "au moins 5 caracteres"})
                .max(120, {error: "au plus 120 caracteres"})
essayer("titre trop court",titre,"bal");
essayer("titre avec espace", titre, "    colloque    ");
essayer("z.email()", z.email(), "eddine@example");
essayer("z.int() avec 4.5", z.int(), 4.5);
essayer("z.number().positive() avec -5", z.number().positive(), -5);

section("4. test sur les objects ")
const evenement = z.object(
    {title: z.string(), capacity: z.number()}
)
essayer("object correct", evenement, {title: "Colloque",capacity: 80})
essayer("deux champs faux",evenement, {title: 42, capacity: "80"})
essayer("z.object + champ en trop", evenement, {title: "Colloque",capacity: 80, seatsTaken: 999});
essayer("z.strictObject + champ de trop",
     z.strictObject({title: z.string(), capacity: z.number()}),
    {title: "colloque", capacity: 80, seatsTaken: 999});

section("5. optional, nullable, default")
essayer("optional() avec rien", z.string().optional(), undefined);
essayer("nullable() avec null", z.string().nullable(), null);
essayer("default() avec rien", z.number().default(1), undefined);

section("6. test sur enum")
const typeBillet = z.enum(["REGULAR","STUDENT"])
essayer("enum avec STUDENT", typeBillet, "STUDENT")
essayer("enum avec VIP", typeBillet, "VIP")

section("7. test sur coerce")
essayer("coerce.number('80')",z.coerce.number(),'80');
essayer("coerce.number('123abc')",z.coerce.number(),'123Abc');

essayer('coerce avec date(2026-11-20)',z.coerce.date(),'2026-11-20');
essayer('coerce avec boolean "false"',z.coerce.boolean(),"false");
const schema = z.preprocess(
    (valeur) => {
        if(valeur === "oui") return true;
        if(valeur === "non") return false;
        return valeur;
    },
    z.boolean()
)

console.log(schema.parse("oui"));
console.log(schema.parse(true));
console.log(schema.parse("non"));
//console.log(schema.parse("abc"));


section("8. refine pour les date")// refine c'est une couche supplementaire pour les donnees deja validee, renvoie true (accepte) ou false (refuse)
const dateFuture = z.coerce.date().refine((d) => d > new Date(), {error: "La date elle doit etre dans le futur !"})
essayer("une date dans le passe", dateFuture,"2020-01-01")
essayer("une date futur", dateFuture, "2026-12-12")


section("9. refine sur deux champs")
const prix = z
            .object({price: z.coerce.number() , studentPrice: z.coerce.number()})
            .refine((p)=> p.price > p.studentPrice, {error: "Le prix etudiant doit etre inferieur au prix regulier"})
essayer("etudiant : 20, regulier : 30", prix, {price: 30, studentPrice: 20});
essayer("etudiant : 40, regulier : 30", prix, {price: 30, studentPrice: 40});


section("10. sur les transform")
// transform : change la valeur apres la validation
const enCents = z
                .string()
                .regex(/^\d+([.,]\d{1,2})$/)
                .transform((texte) => Number(texte.replace(",",".")) * 100)

essayer(" '40,50' enCents ", enCents, "40,9")
essayer("test sur abc",enCents,"abc")



section("11. tester avec z.infer")

const RoleSchema = z.enum([
    "PARTICIPANT",
    "ORGANIZER",
    "ADMIN"
])

type role = z.infer<typeof RoleSchema>

const userSchema = z.object({
    nom: z.string(),
    courriel: z.email(),
    age: z.int(),
    role : RoleSchema
})

type user = z.infer<typeof userSchema>

const user = userSchema.parse({
    nom: "Eddine",
    courriel: "eddine@exemple.ca",
    age: 28,
    role: "PARTICIPANT"
})

console.log(user)
// const evenement = z.object({title: z.string(), capacity: z.number()})

type Evenement = z.infer<typeof evenement>
const exemple: Evenement = {title:"colloque", capacity:80}
console.log("test sur evenement : ",JSON.stringify(exemple))

section("13. test sur les attaques-api")