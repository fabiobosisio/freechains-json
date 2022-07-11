const fs = require('fs');
const util = require('util')

// Carrega o automerge no node
const Automerge = require('automerge')

// Inicializamos o documento para conter inicialmente uma lista vazia de cards. 
//let Doc = Automerge.from({ cards: [] })

let Doc = Automerge.from({cards:[

{done:true,"title":"P2P networking is..."},
{done:true,"title":"P2P networking is ok"},

]});

console.log("Documento original do passo 1\n ",Doc);

// Salva o arquivo local .automerge com os metadados automerge do json
fs.writeFileSync("file1.automerge", Automerge.save(Doc), {encoding: null}); 
		
// Salva o arquivo local .json
fs.writeFileSync("file1.json", JSON.stringify(Doc), {encoding: null}); 
console.log("Documento original do passo 1 salvo em disco!\n ");


