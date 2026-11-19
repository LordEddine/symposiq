import type { PrismaClient } from "../app/generated/prisma/client";
import { calculerTaxes } from "./taxes";

export class BilletError extends Error {}

const TRENTE_MINUTE = 30*60*1000;

// Version 1 : fausse deux ecritures sans transactions

export async function acheterSansTransaction(prisma: PrismaClient, userId: string, eventId: string){
    const evenement = await prisma.event.findUniqueOrThrow({ where: {id: eventId}});
    const taxes = calculerTaxes(evenement.priceCents);
    const commande = await prisma.order.create({
        data: {
            userId,
            subtotalCents: taxes.base,
            tpsCents : taxes.tps,
            tvqCents : taxes.tvq,
            totalCents : taxes.total,
            reservedUntil : new Date(Date.now() + TRENTE_MINUTE),
            items: {
                create: {
                    eventId, ticketType : "REGULAR", quantity: 1, 
                    unitPriceCents : evenement.priceCents, eventTitle : evenement.title
                },
            },
        },
    });
    await prisma.event.update({ where : {id : eventId}, data: {seatsTaken: {increment: 1}}})
    return commande;
}

// Version 2 : erreur dans le cas avec des acheteurs simultanes, dans tx.event.update
export async function acheterNaif(prisma: PrismaClient, userId: string, eventId: string){
    return prisma.$transaction(async (tx)=> {
        const evenement = await tx.event.findUniqueOrThrow({where: {id: eventId}})
        if(evenement.seatsTaken >= evenement.capacity) throw new BilletError("Complet");

        const taxes = calculerTaxes(evenement.priceCents);
        const commande = await tx.order.create({
            data: {
            userId,
            subtotalCents: taxes.base,
            tpsCents : taxes.tps,
            tvqCents : taxes.tvq,
            totalCents : taxes.total,
            reservedUntil : new Date(Date.now() + TRENTE_MINUTE),
            items: {
                create: {
                    eventId, ticketType : "REGULAR", quantity: 1, 
                    unitPriceCents : evenement.priceCents, eventTitle : evenement.title
                },
            },
            },
        });
        await tx.event.update({where: {id: eventId}, data: {seatsTaken: evenement.seatsTaken + 1}});
        return commande;
    })
}

// version 3 : Tout est bon ici
export async function acheterBillet(prisma: PrismaClient, userId: string, eventId: string){
    return prisma.$transaction(async (tx)=>{
        const evenement = await tx.event.findUniqueOrThrow({where: {id: eventId}})
        const maintenant = new Date();
        if(evenement.seatsTaken >= evenement.capacity) throw new BilletError("Complet");
        if(evenement.startsAt <= maintenant) throw new BilletError("Evenement deja commence");
        if(evenement.status !== "PUBLISHED") throw new BilletError("Evenement non disponible");

        const reservation = await tx.event.updateMany({
            where: {
                id: eventId,
                status: "PUBLISHED",
                startsAt: {gt: maintenant},
                seatsTaken: {lt: evenement.capacity}
            },
            data: {seatsTaken: {increment: 1}},
        });
        if(reservation.count === 0) throw new BilletError("Complet");

        const taxes = calculerTaxes(evenement.priceCents);
        
        return tx.order.create({
            data:{
                userId,
                subtotalCents: taxes.base,
                tpsCents : taxes.tps,
                tvqCents : taxes.tvq,
                totalCents : taxes.total,
                reservedUntil : new Date(Date.now() + TRENTE_MINUTE),
                items: { 
                    create: {
                        eventId, 
                        ticketType : "REGULAR", 
                        quantity: 1, 
                        unitPriceCents : evenement.priceCents, 
                        eventTitle : evenement.title
                },
            },
            }
        })

    })
}