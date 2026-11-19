import { prisma } from "@/lib/prisma"
import { organisateurTemporaire } from "@/lib/organisateur-temporaire"

type NouvelEvenementRecu = {
    title: string;
    capacity: number;
    location: string;
    price: string;
    startsAt: string;
}

// POST /api/evenemnts
export async function POST(request: Request){
    const corps = (await request.json()) as NouvelEvenementRecu;
    const {price, ...reste} = corps;
    const organisateur = await organisateurTemporaire();

    const evenement = await prisma.event.create({
        data: {
            ...reste,
            priceCents : Math.round(Number(price) * 100),
            organizerId: organisateur.id,
        }
    })

    return Response.json(evenement, {status: 201});

}