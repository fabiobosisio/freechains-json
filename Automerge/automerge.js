const fs = require('fs');

// Carrega o automerge no node
const Automerge = require('automerge')

// coleta os argumentos
const filename = process.argv[2];
const command = process.argv[3];
const n0 = process.argv[4];
const type = process.argv[5];
let v0 = process.argv[6];

// variáveis de trabalho
let currentDoc, newDoc;


// seleciona o comando a ser executado
switch (command) {
  case 'init': // inicializa um documento minimo
    console.log(command);
    newDoc = Automerge.init();
  break;

  case 'add': // adiciona objetos
    console.log(command);
    //Carrega o último arquivo salvo

    currentDoc = Automerge.load(fs.readFileSync(filename+".atm", {encoding: null}));


    
    //faz a alteração
    newDoc = Automerge.change(currentDoc, currentDoc => {
		if (!currentDoc[n0]) currentDoc[n0] = {}
	})    
  break;
  
    case 'set': // adiciona objetos
    console.log(command);
    //Carrega o último arquivo salvo
    currentDoc = Automerge.load(fs.readFileSync(filename+".atm", {encoding: null}));
    
    //faz a alteração
    newDoc = Automerge.change(currentDoc, currentDoc => {
		if (type == 'string') currentDoc[n0] = v0
		if (type == 'number') currentDoc[n0] = Number(v0)
		if (type == 'bool') currentDoc[n0] = JSON.parse(v0)
		if (type == 'null' || v0 == 'null') currentDoc[n0] = null
		if (type == 'nested') currentDoc[n0] = {}

	})  
  break;
  
  /*
    case 'add': // adiciona objetos
    console.log(command);
    //Carrega o último arquivo salvo
    currentDoc = Automerge.load(fs.readFileSync(filename+".atm", {encoding: null}));
    
    //faz a alteração
    newDoc = Automerge.change(currentDoc, currentDoc => {
		if (!currentDoc[n0]) currentDoc[n0] = []
		currentDoc[n0].push({[n1]:v1})
	})    
  break;
  
    
  case 'change':// altera seções
    console.log(command);
    //Carrega o último arquivo salvo
    currentDoc = Automerge.load(fs.readFileSync(filename+".atm", {encoding: null}));
    
    //faz a alteração
    newDoc = Automerge.change(currentDoc, currentDoc => {
		currentDoc[n0][position][n1] = v1;
	})
  break;
*/	 
	 
  case 'rem':// apaga seções
    console.log(command);
    //Carrega o último arquivo salvo
    currentDoc = Automerge.load(fs.readFileSync(filename+".atm", {encoding: null}));
    //Apaga
    newDoc = Automerge.change(currentDoc, currentDoc => {
		  delete currentDoc[n0];
	})
  break;
	 
}

// Salva o arquivo local .automerge com os metadados automerge do json
fs.writeFileSync(filename+".atm", Automerge.save(newDoc), {encoding: null}); 
		
// Salva o arquivo local .json
fs.writeFileSync(filename+".json", JSON.stringify(newDoc), {encoding: null});
