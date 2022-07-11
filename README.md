Freechains-JSON - Utilit�rio de commit/checkout de arquivos JSON Automerge based em cadeias Freechains
=================================================================================================

O conceito desse utilit�rio � a integra��o entre o [Automerge](https://github.com/automerge/automerge) e o [Freechains](https://github.com/Freechains/README)e obter os ganhos dessa sinergia.

O [Freechains](https://github.com/Freechains/README) � um protocolo de rede de dissemina��o de conte�do peer-to-peer, baseada nos modelos local-first baseado em t�picos publish-subscribe. Utiliza o sistema de dissemina��o n�o estruturada baseada em gossip, utiliza ordena��o parcial de melhor esfor�o baseada em happened-before, possui um sistema de reputa��o por t�pico para garantir a qualidade e a saude da rede e por fim permite diversos tipos de comunica��o p�blica e privada (1-\> N, 1 \<-N, N \<-\> N, 1 \<-).

O [Automerge](https://github.com/automerge/automerge)�funciona como um commutative replicated data type, ou CmRDT, JSON based, ou seja, ele cria uma estrutura de dados JSON armazenada em disco na forma de um arquivo de opera��es.


Desenvolvimento
---------------

Desenvolvi um aplicativo utilizando a liguagem  nodejs no formato de arquivo �nico:

### freechains-json.js

Essa ferramenta foi desenvolvida em nodejs para ser executada em linha de comandos linux.


Prepara��o do ambiente:
-----------------------

O ambiente utilizado � composto por um Raspberry PI 2B rev 1.1 com 1GB de RAM
utilizando o Raspbian GNU/Linux 10 (buster) com os seguintes softwares:

-   Freechains v0.9.0

-   Automerge 1.0.1-preview.6

-   NodeJS v14.15.4

Para que a proposta colaborativa funcione, � necess�rio um pequeno ajuste no Automerge para que ele permita forks a partir de vers�es anteriores do arquivo. nativamente ele n�o permite compara��es de vers�es criadas a partir de um fork de um �nico ponto.

Copie o arquivo modificado new.js contido no diretorio Automerge desse reposit�rio para o seguinte diret�rio no seu local de instala��o: 

### /home/pi/node_modules/automerge/backend



Uso
---

### Commit

*Exemplo:*

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
node freechains-json.js --host=localhost:8330 (opcional) commit #p2p.json p2p.md.json --sign=003030E0D03030D (opcional) --verbose (opcional)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~


### Checkout

*Exemplo:*

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
node freechains-json.js --host=localhost:8330 (opcional) checkout #p2p.json p2p.md.json --verbose (opcional)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Steps
-----

O diret�rio Steps possui as ferramentas para gerar cada um dos passos da simula��o do capitulo 4.1 do artigo Peer-to-Peer Consensus via Authoring Reputation.

*Exemplo de Uso: node step1.js* 

Utilize ap�s a execu��o de cada step o freechains-json para comitar o arquivo p2p.md.json ou p2p.md.automerge atualizado a cada execu��o dos steps.


Test Files
----------

O diret�rio Teste Files possui arquivos de teste para valida��o do sistema. Os arquivos file3.automerge e file3.5.automerge s�o forks do arquivo file2.automerge.


Test Files Gen
--------------

O diret�rio Teste Files gen possui as ferramentas para gerar cada um dos arquivos contidos no diret�rio Test File, sendo que o passo 1 (que gera o primeiro arquivo: file.automerge, possui vers�es para gerar esse arquivo com diversos tamanhos - isso ser� utilizado em avalia��es posteriores)

*Exemplo de Uso: node passo1.js* 

Tool Box
--------

O diret�rio Tool Box possui algumas ferramentas que desenvolvi para apoiar os testes e evolu��o do freechains-json:

-   limpa.sh: Apaga os arquivos *.json *.automerge *.network *.diff contidos no diret�rio.

	*Uso: ./limpa.sh* 

-   compara.js: Exibe simultaneamente dois arquivos *.automerge convertidos para JSON para fins de compara��o.

	*Uso: node compara.js nomedoarquivo1.automerge nomedoarquivo2.automerge* 

-   automergetojson.js: Como o pr�prio nome j� diz, converte arquivos *.automerge para *.json.

	*Uso: node automergetojson.js nomedoarquivo.automerge* 

