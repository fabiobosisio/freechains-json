const fs = require('fs');

// Carrega o automerge no node
const Automerge = require('automerge')

// coleta os argumentos
const filename = process.argv[2]; // nome do arquivo
const command = process.argv[3]; // comando primário
const n0 = process.argv[4]; // primeiro variavel
const element = process.argv[5]; // tipo do elemento
const n1 = process.argv[6]; // segunda variável
const type = process.argv[7]; // tipo do dado
const n2 = process.argv[8]; // terceira variável
const index = parseInt(process.argv[9]); // numero do indice
const listelement = process.argv[10]; //tipo do elemento da lista
const n3 = process.argv[11]; // quarta variável
const listype = process.argv[12]; //tipo do objeto da lista
const n4 = process.argv[13]; // quinta variável

// habilita modo verboso
const v = true; 

// variáveis de trabalho
let currentDoc, newDoc;


// seleciona o comando a ser executado
if (v) console.log("Comando: " +command);
switch (command) {
    case 'init': // comando de inicialização
	newDoc = Automerge.init();
	if (v) console.log(newDoc);
    break;
  
    case 'set': // comando de manipulação
	//Carrega o último arquivo salvo
	currentDoc = Automerge.load(fs.readFileSync(filename+".atm", {encoding: null}));
    
	// seleciona o comando a ser executado
	if (v) console.log("Tipo do Elemento: "+ element);
	switch (element) { 
	   case 'object': // adiciona objetos
		newDoc = Automerge.change(currentDoc, currentDoc => {
		    if (!currentDoc[n0]) currentDoc[n0] = {}
	    })
	    if (v) console.log(newDoc); 
	    break;
	
	    case 'field': // adiciona campos
	    if (v) console.log("Tipo da estrutura: "+ type)
	    newDoc = Automerge.change(currentDoc, currentDoc => {
		if (type == 'string') currentDoc[n0][n1] = n2;
		//To do outros tipos abaixo
		//if (type == 'number') currentDoc[n1] = Number(n2)
		//if (type == 'bool') currentDoc[n1] = JSON.parse(n2)
		//if (type == 'null' || n2 == 'null') currentDoc[n1] = null
		if (type == 'array'){
		    if (!n2) currentDoc[n0][n1] = [] // cria uma lista vazia
		    else if (n2 == 'index'){ // alimenta a lista de acordo com o indice
			    if (v) console.log("Posicao na lista: " +index)
			    if (v) console.log("Tipo do elemento da lista: " +listelement)
			    switch (listelement) {
				case 'object': 
				   //currentDoc[n0][n1].insertAt(index, {});
				   if (listype == 'string') currentDoc[n0][n1].insertAt(index, {[n3]:n4});
				   else if (v) console.log("todo: outros tipos (lista)");
				break;
				case 'item':
				    currentDoc[n0][n1].insertAt(index, n3);
				break;
			 
			    }
			}
		}
	    })
	    if (v) console.log(newDoc);
	    break;
	}
    
 
    break;
	 
    case 'rem':// apaga seções
	//Carrega o último arquivo salvo
	currentDoc = Automerge.load(fs.readFileSync(filename+".atm", {encoding: null}));
	//Apaga
	newDoc = Automerge.change(currentDoc, currentDoc => {
		delete currentDoc[n0];
	})
	if (v) console.log(newDoc);
    break;
	 
}

// Salva o arquivo local .automerge com os metadados automerge do json
fs.writeFileSync(filename+".atm", Automerge.save(newDoc), {encoding: null}); 
		
// Salva o arquivo local .json
fs.writeFileSync(filename+".json", JSON.stringify(newDoc), {encoding: null});
