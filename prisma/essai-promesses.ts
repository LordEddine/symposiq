function acheter(nom: string, reussit: boolean){
    return new Promise<string>((resolve, reject)=>{
        setTimeout(()=>{
            console.log(`(${nom} a termine)`)
            if(reussit) resolve(`billet pour ${nom}`);
            else reject(new Error(`${nom} : complet`))
        },300);
    })
}

const duree = (debut: number) => `${Math.round((Date.now() - debut) / 100) * 100} ms`

async function main(){
    // Cas normal avec await
    console.log("1. Avec await, l'un apres l'autre");
    let debut = Date.now()
    await acheter("Eddine", true);
    await acheter("John", true);
    await acheter("lea", true);

    console.log(`Duree : ${duree(debut)}`)
    // Cas promiseAll tout reussit
    console.log("2. Promise.All, tout reussit");
    debut = Date.now()
    const billets = await Promise.all([acheter("Eddine",true),acheter("John", true),acheter("lea", true)])
    console.log(`   Resultat : ${JSON.stringify(billets)}`)
    console.log(`   Duree : ${duree(debut)}`)


    // Cas promiseAll un achat echoue
    console.log("3. Promise.all un achat echoue")
    try{
        await Promise.all([acheter("Eddine",true),acheter("John", false),acheter("lea", true)])
    }catch(e){
        console.log(`   Erreur : ${(e as Error).message}`)
    }

    // Promise.allSettled un achat qui echoue
    console.log("4. Promise.allSettledm un achat echoue")
    const resultat = await Promise.allSettled([acheter("Eddine",true),acheter("John", false),acheter("lea", true)])
    for(const r of resultat){
        console.log(r.status === "fulfilled" ? `  reussi: ${r.value}` : `  echoue: ${r.reason.message}`)
    }
}

main()