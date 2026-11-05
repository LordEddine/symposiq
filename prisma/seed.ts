import "dotenv/config"

import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../app/generated/prisma/client"
import { calculerTaxes } from "@/lib/taxes"

const prisma = new PrismaClient({ adapter: new PrismaPg({
        connectionString: process.env.DATABASE_URL
    })
})

const JOUR = 24 * 60 * 60 * 1000;
const dans = (jours : number) => new Date(Date.now() + jours * JOUR);

async function main(){
    await prisma.$transaction([
        prisma.refund.deleteMany(),
        prisma.orderItem.deleteMany(),
        prisma.order.deleteMany(),
        prisma.promoCode.deleteMany(),
        prisma.event.deleteMany(),
        prisma.subscription.deleteMany(),
        prisma.plan.deleteMany(),
        prisma.user.deleteMany(),
        prisma.webhookEvent.deleteMany(),
    ]);

    const pro = await prisma.plan.create({
        data: {name: "Pro", monthlyPriceCents : 2900, trialDays: 14, stripePriceId: "price_local_pro_mensuel"},
    });

    const eddine = await prisma.user.create({
        data:{clerkId: "user_local_eddine", email: "eddine@exemple.ca", role: "ORGANIZER"}
    });

    const jacque = await prisma.user.create({
        data: {clerkId: "user_local_jacque", email: "jacque@exemple.ca", 
            studentEmail: "jacque@etudiant.exemple.ca",}
    });
    await prisma.user.create({
        data: {clerkId:"user_local_lea", email: "lea.tremblay@exemple.ca"}
    });

    await prisma.subscription.create({
        data: {
            status:"TRIALING",
            stripeSubscriptionId : "sub_local_eddine",
            currentPeriodEnd : dans(14),
            userId: eddine.id,
            planId : pro.id,
        }
    });

    const journeeIA = await prisma.event.create({
        data: {
            title      : "Journee de la recherche en IA",       
            startsAt   : dans(30),
            location   : "Montreal, salle 2.105",
            capacity   : 80,       
            priceCents : 4000,  
            studentPriceCents : 2000,
            status     : "PUBLISHED",
            organizerId: eddine.id,
        }
    });

    await prisma.event.create({
        data: {
            title      : "Colloque donnees et societe",       
            startsAt   : dans(45),
            location   : "Quebec, pavillon central",
            capacity   : 120,       
            priceCents : 3500,  
            status     : "PUBLISHED",
            organizerId: eddine.id,
        }
    });

    await prisma.event.create({
        data: {
            title      : "Atelier d'ecriture scientifique",       
            startsAt   : dans(60),
            location   : "En Ligne",
            capacity   : 30,       
            priceCents : 1500,  
            organizerId: eddine.id,
        }
    });

    await prisma.promoCode.create({
        data: { code: "BIENVENUE25", percentOff: 25, maxUses: 50, expiresAt: dans(20), eventId: journeeIA.id}
    })

    // Une commande paye par Jacque : 1 Billet etudiant a 20.00 $
    await prisma.$transaction(async(tx)=>{
        const evenement = await tx.event.findUniqueOrThrow({
            where : {id : journeeIA.id},
        })

        if (evenement.seatsTaken >= evenement.capacity){
            throw new Error("Complet")
        }

        // protection de reservation 
        const reservation = await tx.event.updateMany({
            where: {id: evenement.id, seatsTaken : {lt: evenement.capacity}},
            data: { seatsTaken: {increment: 1}}
        })

        if(reservation.count === 0){
            throw new Error("Complet")
        }



        const prix = evenement.studentPriceCents ?? evenement.priceCents;
        const taxes = calculerTaxes(prix);
        // PAIEMENT AVEC STRIPE - Dans un seed on n'a pas de transaction monetaire`````
        await tx.order.create({
            data: {
                status: "PAID",
                subtotalCents: taxes.base,
                tpsCents : taxes.tps,
                tvqCents : taxes.tvq,
                totalCents : taxes.total,
                reservedUntil : dans(0),
                userId : jacque.id,
                items: {
                    create: {
                        ticketType     : "STUDENT",
                        quantity       : 1,
                        unitPriceCents : prix,
                        eventTitle     : evenement.title,
                        eventId        : evenement.id,
                    }
                }   
            }
        })
    })
    const compte = {
        utilisateurs : await prisma.user.count(),
        Evenements : await prisma.event.count(),
        commandes: await prisma.order.count(),
    }
    console.log("donnee de depart Creees", compte)
}

main()
    .catch((erreur)=> {
        console.error(erreur);
        process.exit(1)
    })
    .finally(() => prisma.$disconnect());