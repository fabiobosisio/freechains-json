const fs = require('fs');

// Carrega o automerge no node
const Automerge = require('automerge')

//Carrega o último arquivo salvo
let Doc = Automerge.load(fs.readFileSync("p2p.atm", {encoding: null}));

// Adiciona mais uma seção
currentDoc = Automerge.change(Doc, 'add another section', doc => {
  doc.sections.push({ title: 'P2P', desc:'P2P does not scale!' })
})

console.log("Step 3:\n ",currentDoc);

let changes = Automerge.getChanges(Doc, currentDoc);

//Salva um arquivo local com a diferença entre file1 e file2
//fs.writeFileSync("temp.automerge", JSON.stringify(changes), {encoding: null});

// Salva o arquivo local .automerge com os metadados automerge do json
fs.writeFileSync("p2p.atm", Automerge.save(currentDoc), {encoding: null}); 
		
// Salva o arquivo local .json
fs.writeFileSync("p2p.json", JSON.stringify(currentDoc), {encoding: null}); 

