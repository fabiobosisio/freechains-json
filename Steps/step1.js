const fs = require('fs');

// Carrega o automerge no node
const Automerge = require('automerge')

// Inicializamos o documento para conter inicialmente uma lista vazia de cards. 
let Doc = Automerge.from({ sections: [] })

// Adiciona um card
let currentDoc = Automerge.change(Doc, 'Add a section', doc => {
  doc.sections.push({title:'Introduction',desc:'P2p networking is...'})
})

console.log("Step 1:\n ",currentDoc);

// Salva o arquivo local .automerge com os metadados automerge do json
fs.writeFileSync("p2p.atm", Automerge.save(currentDoc), {encoding: null}); 
		
// Salva o arquivo local .json
fs.writeFileSync("p2p.json", JSON.stringify(currentDoc), {encoding: null}); 


