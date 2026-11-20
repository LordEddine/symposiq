import "dotenv/config";

import {PrismaPg} from "@prisma/adapter-pg" 
import { PrismaClient } from "../generated/prisma/client";

const prisma = new PrismaClient({ adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL
})});

async function afficherDerniers(){ // les 5 plus recent
    const evenement = await prisma.event.findMany({
        orderBy: {createdAt: "desc"},
        take: 5,
        select:{ title: true, startsAt: true, capacity: true, seatsTaken: true, priceCents: true, status:true}
    });

    console.table(
        evenement.map((e) => ({
            ...e,
            startsAt: e.startsAt.toISOString().slice(0,16),
            title: e.title.slice(0,15),
        }))
    )
}

afficherDerniers().finally(() => prisma.$disconnect());

