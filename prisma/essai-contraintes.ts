import "dotenv/config"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../app/generated/prisma/client"
const JOUR = 24 * 60 * 60 * 1000;
const dans = (jours : number) => new Date(Date.now() + jours * JOUR);
const prisma = new PrismaClient({adapter: new PrismaPg({connectionString: process.env.DATABASE_URL})});

async function essayer(description: string, action: () => Promise<unknown>){
    try{
        await action()
        console.log(`Accepte ${description} <-- probleme : la base aurait du refuser`)
    }catch(erreur){
        const e = erreur as {code? :string, message: string }
        const contrainte = e.message.match(/constraint[^`"]*[`"]([^`"]+)[`"]/)?.[1] ?? "?";
        console.log(`Refuse ${description} -> ${e.code} (${contrainte})`)
    }
}

async function main(){
    const evenement = await prisma.event.findFirstOrThrow({
        where : {
            title:"Journee de la recherche en IA"
        }})

    const eddine = await prisma.user.findUniqueOrThrow({where: {email: "eddine@exemple.ca"}})

    await essayer("Deux compte avec le meme courriel", () => 
        prisma.user.create({ data: {clerkId: "user_local_doublon", email: "eddine@exemple.ca"}}));

    await essayer("Vendre 81 places sur 80", () => 
        prisma.event.update({where:{ id: evenement.id }, data: { seatsTaken: 81 }}));

    await essayer("Prix negatif", ()=>
        prisma.event.update({where: {id: evenement.id}, data: {priceCents: -1000}}));

    await essayer("Creation d'un evenement avec une date negatif", ()=>
        prisma.event.create({data: {
            title      : "Exemple ",       
            startsAt   : dans(-45),
            location   : "Quebec, pavillon central",
            capacity   : 120,       
            priceCents : 3500,  
            status     : "PUBLISHED",
            organizerId: eddine.id,
        }}
    ))

    await essayer("Un code promo de 150%", ()=>
        prisma.promoCode.create({data: { code: "TROP", percentOff: 150, maxUses: 1, expiresAt: new Date(), eventId: evenement.id}})
    )



    await essayer("Supprimer un organisateur qui a des evenement",()=>
        prisma.user.delete({where: {id: eddine.id }}))

}
main().finally(() => prisma.$disconnect());