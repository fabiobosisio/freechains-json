// Ferramenta de commit/checkout de arquivos JSON Automerge em cadeias Freechais
// Uso: 
// node freechains-json.js --host=localhost:8330 (opcional) commit #p2p.json p2p.json --sign=003030E0D03030D (opcional) --verbose (opcional)
// node freechains-json.js --host=localhost:8330 (opcional) checkout #p2p.json p2p.json --verbose (opcional)

// node freechains-json.js --host=localhost:8330 commit #p2p.json p2p.json --sign=003030E0D03030D --verbose

// ----------------------------------------- COLETA A TRATA OS ARGUMENTOS DA LINHA DE COMANDO ------------------------------------------------

const args = getArgs(); 

// Display dos argumentos coletados
if(args.verbose){
	console.log('\x1b[1m\x1b[31m%s',`\nModo prolixo habilitado\n`,'\x1b[0m');  // Modo prolixo
	console.log(args);}

// ----------------------------------------- DECLARAÇÃO DE VARIÁVEIS E CONSTANTES GLOBAIS E TRATAMENTOS ------------------------------------------------

// verifica a operação a ser feita (recebe a operação a ser feita e o nome do arquivo)
let oper; // A operação a ser feita
let file; // O nome do arquivo a ser recebido
if (args.commit){ 
	oper = "commit";
	if(args.commit.split('.').pop()=="json"){ // verifica se o arquivo para postar possui a extensão json
		file = args.commit.split('.').slice(0, -1).join('.')+".atm"; // recebe o nome do arquivo a ser postado ajustando a extensão para automerge

	}else{
		if(args.commit.split('.').pop()=="automerge"){ // verifica se o arquivo para postar possui a extensão automerge
			file = args.commit;// recebe o nome do arquivo a ser postado
		}else{
			console.log('\x1b[1m\x1b[31m%s',`\nUtilize arquivos JSON/AUTOMERGE\n`,'\x1b[0m'); 
			return;
		}
	}
}else if (args.checkout){
	oper = "checkout";
	file = args.checkout; // recebe o nome do arquivo a ser recebido
}

// recebe a cadeia que será utilizada
const chain = args.chain 

// recebe o endereço do host
let host = 'localhost:8330';
if (args.host){
	host = args.host; 
}

// recebe a chave privada
let pvtkey = 'nao fornecido'
let pubkey = 'nao fornecido'
if (args.sign){ 
	pvtkey = args.sign; //Captura a chave privada se fornecida
	pubkey = args.sign.toString().substring(64, args.sign.toString().lenght); // Filtra a chave publica
}
if(args.verbose){
	console.log("\nChave privada: "+ pvtkey + "\nChave publica: " + pubkey);
}

// Display do que vai ser feito
if(args.verbose){console.log("\n"+oper + " do arquivo "+ file + " na cadeia " + chain + " do host " + host + "\n");}

// Configura o objeto automerge
const Automerge = require('automerge')


// ----------------------------------------- FUNÇÕES ------------------------------------------------


//Função para tratar os argumentos no formato do Freechains:
function getArgs () {
    const args = {}; //Cria um elemento args
    args._ = [] // Array com globais dos args i.e qualquer outro argumento nao parseado
    process.argv
        .slice(2, process.argv.length) // elimina os 2 primeiros valores do array pois sao o node e o diretorio
        .forEach( arg => { // para cada elemento do array
        // long arg
        if (arg.slice(0,2) === '--') { //verifica se a substring eh --
            const longArg = arg.split('='); // splita a string em um array com chave antes de = e valor exemplo --host=localhost:3333 ficaria no array longArg[0]="--host" e longArg[1]="localhost:3333" 
            const longArgFlag = longArg[0].slice(2,longArg[0].length); // pega o argumento host removendo o -- com substring de 2 ao tamanho da string
            const longArgValue = longArg.length > 1 ? longArg[1] : true; // se o argumento foi parseado e conseguimos splitar em uma array maior que tamanho 1 entao retorna o valor ou seja longArg[1]="localhost:3333" senao o argumento recebe true como default
            args[longArgFlag] = longArgValue; // seta o arg indexando com o valor -> args['host'] = "localhost:8330"
        }
        // flags
        else if (arg[0] === '-') { // se a primeira condicao acima nao foi satisfeita e o primeiro caracter for -
            const flags = arg.slice(1,arg.length).split(''); // letra a letra do argumento por exemplo quando temos rm -rf no linux rm = remove -rf > r=recursive f=force ele splita esses parametros em r e f
            flags.forEach(flag => { // para cada um desses parametros
            args[flag] = true; // ele seta o valor true args['r'] = true e args['f'] = true
            });
        }
        else {
            args._.push(arg) // Aqui entra os demais argumentos
        }
    });
   for(var i = 0; i < args._.length;i++){ // tratando os demais argumentos
	   if (args._[i] === 'checkout' || args._[i] === 'commit'){
			const longArgFlag = args._[i]; //pega a operação
			const longArgValue = args._[i+2]; // pega o nome do arquivo
			const ChainValue = args._[i+1]; // pega a cadeia
			args[longArgFlag] = longArgValue; // seta o arg indexando com o valor
			args['chain'] = ChainValue;
		
		} 
	}
    return args;
}

//Função para postar na cadeia do Freechains
function postfile(filename) {
        var fs = require('fs');
	if(args.verbose){console.log('\x1b[36m%s\x1b[0m',`\nPostando na cadeia ${chain}...`);}	
	const { execSync } = require("child_process");
	let chksum = 0;
	if (pvtkey==='nao fornecido'){ // Aplica a chave se houver
		chksum = execSync("freechains --host="+host+" chain '"+chain+"' post file '"+filename+"'");
		//console.log("freechains --host="+host+" chain '"+chain+"' post file '"+filename+"'");
	}
	else{
		chksum = execSync("freechains --host="+host+" chain '"+chain+"' post file '"+filename+"' --sign="+pvtkey);
		//console.log("freechains --host="+host+" chain '"+chain+"' post file '"+filename+"' --sign="+pvtkey)
	}
	if(args.verbose){console.log('\x1b[36m%s\x1b[0m',`\nPostado! ${chksum}`);}
	
	try{
		fs.unlinkSync('changes.atm');
		
	} catch(err) {}	
	return chksum;
}


//Função para salvar arquivo em disco sobrescrevendo ou não
function savefile(filename,data,message, flag) {
	try {
		const fs = require('fs');
		if(flag=="write")fs.writeFileSync(filename, data,{encodig: 'utf-8', flag: "wx"});
		if(flag=="overw")fs.writeFileSync(filename, data,{encodig: 'utf-8'});
		if(args.verbose){console.log('\x1b[36m%s\x1b[0m',message);}
	}catch{
		if(args.verbose){console.log('\x1b[1m\x1b[31m%s',`\nO arquivo ${filename} ja existe!`,'\x1b[0m\n');}
		//return;
		process.exit();
		}
}

//Função para carregar arquivo em disco
function readfile(filename, message) {
	try {
		const fs = require('fs');
		//const data = fs.readFileSync(filename, 'utf-8');
		//const data = fs.readFileSync(filename, {encoding:'utf8', flag:'r'});
		const data = fs.readFileSync(filename, {encoding: null})
		if(args.verbose){console.log('\x1b[36m%s\x1b[0m',message);}
		if (data == ""){
			console.log('\x1b[1m\x1b[31m%s',`\nO arquivo ${filename} esta vazio!`,'\x1b[0m\n');
			process.exit();
		}
		return data
	}catch{
		if(args.verbose){console.log('\x1b[1m\x1b[31m%s',`\nO arquivo ${filename} nao existe!`,'\x1b[0m\n');}
		process.exit();
		}	
}


//Função para ler a cadeia inteira e obter o payload consolidado
function receivefile() {  
	const { execSync } = require("child_process");
	const genesis = execSync("freechains --host="+host+" chain '"+chain+"' genesis"); // lê o genesis da cadeia	
	if(args.verbose){console.log('\x1b[36m%s\x1b[0m',`\nGenesis da cadeia: ${genesis}`);}	
	//const consensus = execSync("freechains --host="+host+" chain '"+chain+"' traverse "+genesis); // Faz o traverse a partir do genesis
	let consensus = execSync("freechains --host="+host+" chain '"+chain+"' consensus "); // Faz o consensus a partir do genesis	
	consensus = consensus.toString().slice(67); // Remove o Genesis (versão consensus)
	consensus = consensus.toString().substring(0, consensus.toString().length-1);  // Remove o último caracter (\n) que tem vido no consensus 
	if(args.verbose && consensus!=''){console.log('\x1b[36m%s\x1b[0m',`Consensus da cadeia: ${consensus}`);}
	let chainvector = consensus.split(" "); // Segmenta o conteudo do consensus em um vetor de strings
	let temp = [];
	if (chainvector!=''){
		for (var i = 0; i < chainvector.length; i++) { // Para cada elemento do vetor do consensus le o payload
			if(args.verbose){console.log('\x1b[36m%s\x1b[0m','Posicao '+(i+1)+': '+chainvector[i]);}		
			if (i == 0){
				
				/*
				var content = Automerge.load(execSync("freechains --host="+host+" chain '"+chain+"' get payload "+chainvector[i], {encoding: null}));
				console.log("\n",content);
				*/
											
				execSync("freechains --host="+host+" chain '"+chain+"' get payload "+chainvector[i]+" file 'temp.atm'")
				var fsopen = require('fs');
				var content = Automerge.load(fsopen.readFileSync('temp.atm'));
				fsopen.unlink('temp.atm', function (err) { 
					if (err) throw err; 
				});
								
				if(args.verbose){console.log(content);}
			
			}else{		
				let tp = execSync("freechains --host="+host+" chain '"+chain+"' get payload "+chainvector[i]);	
				if(tp!=''){ // para ignorar os blocos de reps
					let file = JSON.parse(tp);
					for (var y = 0; y < file.length; y++) {
						temp.push(Uint8Array.from(Object.values(file[y])));
							
					}
					let [Doc3, patch] = Automerge.applyChanges(content, temp);
					content = Doc3;
					if(args.verbose){console.log(content);}
				}
			}
		}
	}else{
		console.log('\x1b[1m\x1b[31m%s',`Cadeia vazia`,'\x1b[0m\n');
		return "genesis";
	}
	return content;
}


function isEmpty(obj) {
    for(var prop in obj) {
        if(obj.hasOwnProperty(prop))
            return false;
    }

    return true;
}

// ----------------------------------------- CORPO PRINCIPAL ------------------------------------------------

switch (oper) {   
    case "commit":
        console.log('\x1b[36m%s\x1b[0m',`\nCommit selecionado!`);    
	
	// varre a cadeia e recompoe o arquivo automerge
        let netfile = receivefile();
       
       	// Tenta ler o arquivo automerge do json informado 
	let localfile = Automerge.load(readfile(""+file.split('.').slice(0, -1).join('.')+".atm","\nAchou o arquivo "+file.split('.').slice(0, -1).join('.')+".atm"));       
		
	// se o arquivo local não existir
	if (localfile == null ){
			console.log('\x1b[36m%s\x1b[0m',`\nArquivo vazio ou nao localizado`);
			//return;
			process.exit();
	}else{
		// se for genesis da cadeia
		if (netfile == "genesis"){

			let post = postfile(file.split('.').slice(0, -1).join('.')+".atm");
			console.log('\x1b[36m%s\x1b[0m',`\nChecksum da postagem na cadeia:`, '\x1b[37m', `\n${post}`);		
		}
		
		else{ 
			
			// Obtém a diferença entre o arquivo local e o conteudo consolidado da cadeia
			let filediff  = Automerge.getChanges(netfile,localfile);		
						
				if(args.verbose){ 
					console.log('\x1b[36m%s\x1b[0m',`\nDiferenca entre o arquivo local e o conteudo da cadeia:`);
					console.log(filediff);
				}
								
				// Se a diferença for nula
				if (isEmpty(filediff)){
					
					console.log('\x1b[1m\x1b[31m%s',`\nO arquivo ja esta presente na cadeia!`,'\x1b[0m\n');
				}else{
					// Salva a diferença que será enviado pela rede em um arquivo local: changes.temp
					savefile("changes.atm", JSON.stringify(filediff),"\nO arquivo changes.temp foi salvo!", "overw" );

					// Posta o arquivo changes.temp na cadeia do freechains e o apaga em seguida
					let post = postfile("changes.atm");
					console.log('\x1b[36m%s\x1b[0m',`\nChecksum da postagem na cadeia:`, '\x1b[37m', `\n${post}`);				
				}
			}
	}
        break;
        
    case "checkout":
        console.log('\x1b[36m%s\x1b[0m',`\nCheckout selecionado!`);
        // varre a cadeia e recompoe o arquivo automerge
        let node = receivefile();
	
	// se a cadeia estiver vazia ele sai
	if (node != "genesis"){
			
        	// Salva o arquivo local automerge com os metadados automerge do json
		savefile(file.split('.').slice(0, -1).join('.')+".atm", Automerge.save(node),"\nO arquivo "+file.split('.').slice(0, -1).join('.')+".atm foi salvo!", "overw");
		
		// Salva o arquivo local .json
		savefile(file.split('.').slice(0, -1).join('.')+".json", JSON.stringify(node),"\nO arquivo "+file.split('.').slice(0, -1).join('.')+".json foi salvo!", "overw");      
	}
        break;
    default:
        console.log('\x1b[36m%s\x1b[0m',`Operacao invalida!`);
        break;		
}
