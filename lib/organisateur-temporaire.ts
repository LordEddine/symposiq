import { prisma } from "@/lib/prisma"

export async function organisateurTemporaire(){
    return prisma.user.findUniqueOrThrow({ where : { email: "eddine@exemple.ca"}});
}
