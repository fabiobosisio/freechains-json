Freechains-JSON - Utilitário de commit/checkout de arquivos JSON Automerge based em cadeias Freechains
=================================================================================================

O conceito desse utilitário é a integração entre o [Automerge](https://github.com/automerge/automerge) e o [Freechains](https://github.com/Freechains/README)e obter os ganhos dessa sinergia.

O [Freechains](https://github.com/Freechains/README) é um protocolo de rede de disseminação de conteúdo peer-to-peer, baseada nos modelos local-first baseado em tópicos publish-subscribe. Utiliza o sistema de disseminação não estruturada baseada em gossip, utiliza ordenação parcial de melhor esforço baseada em happened-before, possui um sistema de reputação por tópico para garantir a qualidade e a saude da rede e por fim permite diversos tipos de comunicação pública e privada (1-\> N, 1 \<-N, N \<-\> N, 1 \<-).

O [Automerge](https://github.com/automerge/automerge) funciona como um commutative replicated data type, ou CmRDT, JSON based, ou seja, ele cria uma estrutura de dados JSON armazenada em disco na forma de um arquivo de operações.


Desenvolvimento
---------------

Desenvolvi um aplicativo utilizando a liguagem  nodejs no formato de arquivo único:

### freechains-json.js

Essa ferramenta foi desenvolvida em nodejs para ser executada em linha de comandos linux.


Preparação do ambiente:
-----------------------

O ambiente utilizado é composto por um Raspberry PI 2B rev 1.1 com 1GB de RAM
utilizando o Raspbian GNU/Linux 10 (buster) com os seguintes softwares:

-   Freechains v0.9.0

-   Automerge 1.0.1-preview.6

-   NodeJS v14.15.4

Para que a proposta colaborativa funcione, é necessário um pequeno ajuste no Automerge para que ele permita forks a partir de versões anteriores do arquivo. nativamente ele não permite comparações de versões criadas a partir de um fork de um único ponto.

Copie o arquivo modificado new.js contido no diretorio Automerge desse repositório para o seguinte diretório no seu local de instalação: 

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

O diretório Steps possui as ferramentas para gerar cada um dos passos da simulação do capitulo 4.1 do artigo Peer-to-Peer Consensus via Authoring Reputation.

*Exemplo de Uso: node step1.js* 

Utilize após a execução de cada step o freechains-json para comitar o arquivo p2p.md.json ou p2p.md.automerge atualizado a cada execução dos steps.


Test Files
----------

O diretório Teste Files possui arquivos de teste para validação do sistema. Os arquivos file3.automerge e file3.5.automerge são forks do arquivo file2.automerge.


Test Files Gen
--------------

O diretório Teste Files gen possui as ferramentas para gerar cada um dos arquivos contidos no diretório Test File, sendo que o passo 1 (que gera o primeiro arquivo: file.automerge, possui versões para gerar esse arquivo com diversos tamanhos - isso será utilizado em avaliações posteriores)

*Exemplo de Uso: node passo1.js* 

Tool Box
--------

O diretório Tool Box possui algumas ferramentas que desenvolvi para apoiar os testes e evolução do freechains-json:

-   limpa.sh: Apaga os arquivos *.json *.automerge *.network *.diff contidos no diretório.

	*Uso: ./limpa.sh* 

-   compara.js: Exibe simultaneamente dois arquivos *.automerge convertidos para JSON para fins de comparação.

	*Uso: node compara.js nomedoarquivo1.automerge nomedoarquivo2.automerge* 

-   automergetojson.js: Como o próprio nome já diz, converte arquivos *.automerge para *.json.

	*Uso: node automergetojson.js nomedoarquivo.automerge* 

