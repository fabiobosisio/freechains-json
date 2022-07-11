if (!process.argv[2]){
	console.log("Uso: node automergetojson.js nomedoarquivo.atm\n");
	return 0;
	
	}

const name = process.argv[2];

const Automerge = require('automerge')

let doc1 = Automerge.init()

var fs = require('fs');

var data1 = fs.readFileSync(name);

doc1 = Automerge.load(data1);

fs.writeFileSync(name.split('.').slice(0, -1).join('.')+'-restored.json', JSON.stringify(doc1), {encoding: null});
 
console.log('\n Conteudo restaurado de '+name+': \n', doc1);
