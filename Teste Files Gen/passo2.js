const fs = require('fs');
const util = require('util')

// Carrega o automerge no node
const Automerge = require('automerge')


//We initialize the document to initially contain an empty list of cards.
let Doc2 = Automerge.load(fs.readFileSync("file1.automerge", {encoding: null}));
console.log("Novo Documento do passo 2\n ", Doc2);

// Adiciona um card
let currentDoc2 = Automerge.change(Doc2, 'Adiciona um card', doc => {
  doc.cards.push({ title: 'P2P networking is...', done: false })
})
console.log("Adiciona um card\n ",currentDoc2);

let changes = Automerge.getChanges(Doc2, currentDoc2);
console.log("\nObtem a diferenca entre o documento original e o do passo 2\n ");

//Salva um arquivo local com a diferença entre file1 e file2
fs.writeFileSync("temp.automerge", JSON.stringify(changes), {encoding: null});
console.log("Salva a diferenca entre o documento original e o do passo 2 em disco!\n ");

// Salva o arquivo local .automerge com os metadados automerge do json
fs.writeFileSync("file2.automerge", Automerge.save(currentDoc2), {encoding: null}); 
		
// Salva o arquivo local .json
fs.writeFileSync("file2.json", JSON.stringify(currentDoc2), {encoding: null}); 
console.log("Documento do passo 2 salvo em disco!\n ");

