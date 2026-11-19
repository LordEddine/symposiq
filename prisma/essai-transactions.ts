import "dotenv/config"
import {PrismaPg} from "@prisma/adapter-pg"
import { PrismaClient } from "../app/generated/prisma/client"
import { acheterSansTransaction, acheterNaif, acheterBillet } from "@/lib/billeterie"

const prisma = new PrismaClient({adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL})})

const code = (e: unknown) => (e as {code?: string}).code ?? (e as Error).message;

async function nettoyer(){
    await prisma.order.deleteMany({where: {items: {some: {event: {title: {startsWith: "Essai"}}}}}})
    await prisma.event.deleteMany({where: {title: {startsWith: "Essai"}}})
}

async function evenement(titre: string, capacity: number, seatsTaken = 0, dansJours = 1){
    // Mon organisateur 
    const eddine = await prisma.user.findUniqueOrThrow({where : { email: "eddine@exemple.ca"}})
    return prisma.event.create({
        data: {
            title: `Essai : ${titre}`,
            startsAt: new Date(Date.now() + dansJours * 864e5), // 864e5 ms = 1 jour 
            location : "Salle d'essai",
            capacity,
            seatsTaken,
            priceCents: 4000,
            status: "PUBLISHED",
            organizerId: eddine.id,
        }
    })
}

async function bilan(eventId: string){
    const e = await prisma.event.findUniqueOrThrow({where : {id : eventId}})
    const commandes = await prisma.order.count({where: { items: {some: {eventId}}}})

    return `${commandes} commande(s), seatsTaken : ${e.seatsTaken} sur ${e.capacity}`;
}

async function main() {
    await nettoyer();

    const lea = await prisma.user.findUniqueOrThrow({where : {email: "lea.tremblay@exemple.ca"}})
    
    // experiece 1 : deux ecriture, sans transaction
    console.log("1. Sans transaction, sur un evenement complet (2 places sur 2 vendues)")
    const e1 = await evenement("complet sans transaction", 2,2)
    try{
        await acheterSansTransaction(prisma, lea.id, e1.id);
    } catch(e){
        console.log(`  Erreur : ${code(e)}`)
    }

    console.log(`  Resultat: ${await bilan(e1.id)}  <- Commande SANS place.`)

    // experience 2 : les memes ecritures, dans une transaction (forme liste)
    console.log("2. Avec prisma.$transaction([..]), meme situation")
    const e2 = await evenement("complet avec transaction",2,2);
    try{
        await prisma.$transaction([
            prisma.order.create({
                data: {
                    userId: lea.id,
                    subtotalCents: 4000,
                    tpsCents: 200,
                    tvqCents: 399,
                    totalCents: 4599,
                    reservedUntil: new Date(),
                    items: {create:{
                        eventId : e2.id, ticketType: "REGULAR", quantity: 1, unitPriceCents: 4000, eventTitle: e2.title
                    }}
                }
            }),
            prisma.event.update({where: {id: e2.id}, data:{seatsTaken: {increment: 1}}}) // Normalement Echoue
        ])
    }catch(e){
        console.log(`   Erreur: ${code(e)}`)
    }

    console.log(`   Resultat: ${await bilan(e2.id)} <-- tout est annule`)


    // exprience 3 : utilisation de prisma au lieu de tx
    console.log("3. Utiliser prisma au lieu de tx dans la transaction")
    const e3 = await evenement("avec prisma au lieu de tx",10);
    try{
        await prisma.$transaction(async (tx)=>{
            await prisma.order.create({
                data: {
                    userId: lea.id,
                    subtotalCents: 4000,
                    tpsCents: 200,
                    tvqCents: 399,
                    totalCents: 4599,
                    reservedUntil: new Date(),
                    items: {create:{
                        eventId : e3.id, ticketType: "REGULAR", quantity: 1, unitPriceCents: 4000, eventTitle: e3.title
                    }}
                }
            });

            await tx.event.update({where: {id: e3.id}, data: {seatsTaken: {increment: 1}}})
            // AJOUTEZ throw new Error !!!!!!!! (ROLLBACK)
            throw new Error("Paiement Refuse");
        })
    }catch(e){
        console.log(`   Erreur : ${code(e)}`)
    }

    console.log(`   Resultat: ${await bilan(e3.id)} <- la place est annule, la commande reste !!!`)


    // experience 4 : 20 acheteurs pour 5 place : acheterNaif
    console.log("4. 20 acheterus simultanes, 5 places, version naive")
    const e4 = await evenement("concurrence naive", 5);
    const r4 = await Promise.allSettled(Array.from({length: 20},()=> acheterNaif(prisma, lea.id, e4.id)))
    console.log(` Reussis : ${r4.filter((r) => r.status === "fulfilled").length}, 
                    Refusee : ${r4.filter((r)=> r.status === "rejected").length}`)
    console.log(`   Resultat : ${await bilan(e4.id)} <-- survente`)



    // experience 5 : 20 acheteurs simultanes, version correcte
    console.log("5. 20 acheterus simultanes, 5 places, version correcte")
    const e5 = await evenement("concurrence correcte",5);
    const r5 = await Promise.allSettled(Array.from({length: 20},()=> acheterBillet(prisma, lea.id, e5.id)))

    const raisons = r5.filter((r) => r.status === "rejected").map((r) => code((r as PromiseRejectedResult).reason))
    console.log(` Reussis : ${r5.filter((r) => r.status === "fulfilled").length}, 
                    Refusee : ${raisons.length} (${[...new Set(raisons)]})`)
    console.log(`   Resultat : ${await bilan(e5.id)}`)


    // experience 6 : une transaction trop longue
    console.log("6. Une transaction trop longue (6 secondes, limite par defaut : 5)")
    try{
        await prisma.$transaction(async (tx)=>{
            await tx.event.count()
            await new Promise((r) => setTimeout(r, 6000));
            await tx.event.count(); //P2028
        })
    }catch(e){
        console.log(`  Erreur : ${code(e)} - ${(e as Error).message}`)
    }


    await nettoyer();
}
main().finally(()=> prisma.$disconnect());