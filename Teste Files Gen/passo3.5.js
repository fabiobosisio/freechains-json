const fs = require('fs');
const util = require('util')

// Carrega o automerge no node
const Automerge = require('automerge')


//We initialize the document to initially contain an empty list of cards.
let old = Automerge.load(fs.readFileSync("file2.automerge", {encoding: null}));
console.log("Novo Documento do passo 3.5\n ", old);


let temp = fs.readFileSync("temp.automerge", {encoding: null});

let file = JSON.parse(temp);
let changes2 = [];
for (var i = 0; i < file.length; i++) {
  
  changes2.push(Uint8Array.from(Object.values(file[i])));	
  
}

let [Doc3, patch] = Automerge.applyChanges(old, changes2)
// `patch` is a description of the changes that were applied (a kind of diff)
console.log("\nAplica a diferenca no Novo Documento\n ");

// Adiciona mais um card
currentDoc3 = Automerge.change(Doc3, 'Adiciona mais um card', doc => {
  doc.cards.push({ title: 'Freechains e Automerge!', done: false })
})
console.log("Adiciona mais um card\n ",currentDoc3);

let changes = Automerge.getChanges(Doc3, currentDoc3);
console.log("\nObtem a diferenca entre o documento do passo 2 e o do passo 3.5\n ");

//Salva um arquivo local com a diferença entre file1 e file2
fs.writeFileSync("temp.automerge", JSON.stringify(changes), {encoding: null});
console.log("Salva a diferenca entre o passo 2 e 3.5 em disco!\n ");

// Salva o arquivo local .automerge com os metadados automerge do json
fs.writeFileSync("file3.5.automerge", Automerge.save(currentDoc3), {encoding: null}); 
		
// Salva o arquivo local .json
fs.writeFileSync("file3.5.json", JSON.stringify(currentDoc3), {encoding: null}); 
console.log("Documento do passo 3.5 salvo em disco!\n ");

