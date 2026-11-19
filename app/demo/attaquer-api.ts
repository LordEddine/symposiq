const URL_API = "http://localhost:3000/api/evenements";

const dansTrenteJours = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
// "2026-12-19T..."
const valide = {
    title: "Midi-conference sur la cybersecurite",
    location: "Montreal, salle 3200",
    startsAt : dansTrenteJours,
    capacity: 40,
    price: "25.00",
}

const tentative : {nom: string; corps: unknown}[] = [
    {nom: "1. Requete correcte", corps: valide},
    {nom: "2. Titre Vide", corps: {...valide, title: ""}},
    {nom: "3. champs de trop", corps: {...valide,status: "PUBLISHED", seatsTaken: 40}},
    {nom: "4. date depasse", corps: {...valide, startsAt:"2020-01-01T09:00:00:00.000Z"}},
    {nom: "5. capacite negative -5", corps: {...valide, capacity: -5}},
    {nom: "5.1 capacite en texte", corps: {...valide, capacity: "beaucoup"}},
    {nom: "6. prix vide", corps: {...valide, price:""}},
    {nom: "7. prix negatif ", corps: {...valide, price: "-10.00"}},
    {nom: "8. prix a la francaise", corps: {...valide, price: "25,00"}},
    {nom: "9. prix enorme", corps: {...valide, price:"1000000.00"}},
    {nom: "10. prix <abc>", corps: {...valide, price:"abc"}},
    {nom: "11. prix avec arrondi", corps: {...valide, price: "19.999"}},
    {nom: "12. pas de JSON", corps:"ceci n'est pas du JSON"}
];

async function envoyer(nom: string, corps: unknown){
    const texte = typeof corps === "string" ? corps : JSON.stringify(corps);
    const reponse = await fetch(URL_API,{
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: texte,
    })
    const brut = await reponse.text();
    console.log(`\n${nom} -> HTTP ${reponse.status}`);
    try{ // Dans le cas ou la reponse est du JSON, on affiche seulement les champs interessant
        const json = JSON.parse(brut);
        if(reponse.status === 201){
            const { title, capacity, startsAt, seatsTaken, status, priceCents} = json;
            console.log("   cree : ",{title,startsAt, capacity, seatsTaken, priceCents, status})
        }else{
            console.log("   reponse : ", JSON.stringify(json));
        }
    }catch{ // pas du JSON une page d'erreur HTML
        console.log(" reponse : ", brut);
    }
}

async function lancerLesAttaques(){
    for(const {nom, corps} of tentative){
        await envoyer(nom, corps);
    }
}

lancerLesAttaques();