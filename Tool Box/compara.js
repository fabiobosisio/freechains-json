const args = process.argv;
const fileA = args[2];
const fileB = args[3];

// Configurando o objeto automerge
const Automerge = require('automerge')

let doc1 = Automerge.init()

var fsopen = require('fs');
var fsopen2 = require('fs');

var data = fsopen.readFileSync(fileA, {encoding: null});

var data2 = fsopen2.readFileSync(fileB, {encoding: null});

doc1 = Automerge.load(data);
doc2 = Automerge.load(data2);

console.log('\n Conteudo de %s: \n', fileA, doc1);

console.log('\n Conteudo de %s: \n', fileB, doc2);

let filediff  = Automerge.getChanges(doc1,doc2);
//let filediff  = Automerge.getHistory(doc2,doc1);

console.log('\n Changes: \n', filediff);

