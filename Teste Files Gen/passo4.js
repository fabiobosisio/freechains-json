const fs = require('fs');
const util = require('util')

// Carrega o automerge no node
const Automerge = require('automerge')


//We initialize the document to initially contain an empty list of cards.
let old = Automerge.load(fs.readFileSync("file3.automerge", {encoding: null}));
console.log("Novo Documento do passo 4\n ", old);

let temp = fs.readFileSync("temp.automerge", {encoding: null});

let file = JSON.parse(temp);
let changes2 = [];
for (var i = 0; i < file.length; i++) {
  
  changes2.push(Uint8Array.from(Object.values(file[i])));	
  
}

let [Doc4, patch] = Automerge.applyChanges(old, changes2)
// `patch` is a description of the changes that were applied (a kind of diff)
console.log("\nAplica a diferenca no Novo Documento\n ");

// Marca um card como feito
currentDoc4 = Automerge.change(Doc4, 'Marca um card como feito', doc => {
  doc.cards[0].done = true
})
console.log("Marca um card como feito\n ",currentDoc4);

let changes = Automerge.getChanges(Doc4, currentDoc4);
console.log("\nObtem a diferenca entre o documento do passo 3 e o do passo 4\n ");

//Salva um arquivo local com a diferença entre file1 e file2
fs.writeFileSync("temp.automerge", JSON.stringify(changes), {encoding: null});
console.log("Salva a diferenca entre o passo 3 e 4 em disco!\n ");

// Salva o arquivo local .automerge com os metadados automerge do json
fs.writeFileSync("file4.automerge", Automerge.save(currentDoc4), {encoding: null}); 
		
// Salva o arquivo local .json
fs.writeFileSync("file4.json", JSON.stringify(currentDoc4), {encoding: null}); 
console.log("Documento do passo 3 salvo em disco!\n ");

