type NouvelEvenement = {
    title : string;
    capacity: number;
}

const texteRecu = '{"title" : 42, "capacity": "80"}';

const recu = JSON.parse(texteRecu) as NouvelEvenement;

console.log("typeof capacity : ",typeof recu.capacity);

console.log("capacity + 10 : ", recu.capacity + 10);

try{
    console.log("title :", recu.title.toUpperCase());
}catch(e){
    console.log("title : Quelque chose", (e as Error).message);
}