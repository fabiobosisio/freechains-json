const fs = require('fs');

// Carrega o automerge no node
const Automerge = require('automerge')

//Carrega o último arquivo salvo
let Doc = Automerge.load(fs.readFileSync("p2p.atm", {encoding: null}));

// Altera a descrição de uma seção
currentDoc = Automerge.change(Doc, 'Change the description of a section', doc => {
  doc.sections[0].desc = 'P2p computing is...'
})

console.log("Step 4 PEER B:\n ",currentDoc);

let changes = Automerge.getChanges(Doc, currentDoc);

//Salva um arquivo local com a diferença entre file1 e file2
//fs.writeFileSync("temp.automerge", JSON.stringify(changes), {encoding: null});

// Salva o arquivo local .automerge com os metadados automerge do json
fs.writeFileSync("p2p.atm", Automerge.save(currentDoc), {encoding: null}); 
		
// Salva o arquivo local .json
fs.writeFileSync("p2p.json", JSON.stringify(currentDoc), {encoding: null}); 

