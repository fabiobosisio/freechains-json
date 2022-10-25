# Freechains-JSON: Automerge CRDT based JSON file upload utility for Freechains Networks

Freechains-JSON is a tool that alows to do uploads of Automerge CRDT based JSON file to Freechains Networks enabling to put into practice the concept of permissionless decentralized network-stored data structures with arbitrary data set.

Multiple users can collaboratively edit a data structure that will be shared across the network, ensuring consensus, reliability, and data delivery, and preventing abuse and haters.

- [Commands](Docs/cmds.md): list of all protocol commands


## Install

First, you need to install `java` and `libsodium` (Freechains dependencies):

```
sudo apt install default-jre libsodium23
```

Then, you are ready to install `freechains`:

```
wget https://github.com/Freechains/README/releases/download/v0.10.0/install-v0.10.0.sh

# choose one:
sh install-v0.10.0.sh .                    # either unzip to current directory (must be in the PATH)
sudo sh install-v0.10.0.sh /usr/local/bin  # or     unzip to system  directory
```

And now, you need to install `automerge` and `nodejs`:

```
sudo apt install nodejs

```
```
npm install automerge ## or yarn add automerge
```

For the collaborative proposal to work, it is necessary to make a small adjustment in Automerge so that it allows forks from previous versions of the file. natively it does not allow comparisons of versions created from a single point fork.

Copy the modified new.js file contained in the [Mods directory of this repository](Mods/) to the following directory at your installation location:

```
/home/pi/node_modules/automerge/backend
```

And finally, clone the `freechains-json` repository to use the tool:

```
git clone https://github.com/fabiobosisio/freechains-json.git

```


The versions used in the tests were:

-   Freechains v0.10.0

-   Automerge 1.0.1-preview.6

-   NodeJS v14.15.4

## Basics

The basic use of Freechains-json is very straightforward:

- `node freechains-json.js --host=localhost:8330 (opcional) commit <chain> <file_to_upload> --sign=<pvt> (opcional) --verbose (opcional)`:     Commit - Publish the difference between the local file and the most current content on the network. The publication is done in binary to save space on the network.
- `node freechains-json.js --host=localhost:8330 (opcional) checkout <chain> <file_to_download> --verbose (opcional)")`:           Checkout - 
Download the content from the network and recompose the file with the latest content.

Follows a step-by-step execution:

- Start a Freechains host:

```
freechains-host start /home/pi/servers/distsys
```

- Switch to another terminal.

- Create an identity:

```
freechains crypto pubpvt "secret password" # creates two keys, public and private
96700ACD1128035FFEF5DC264DF87D5FEE45FF15E2A880708AE40675C9AD039E
```

- Create and Join the public forum `#p2pforum`:

```
freechains chains join ’#p2pforum’ ’96700ACD1...’  # type the full shared key above
C40DBB...
```

- Use the AM editor to create and edit an automerge file (i.e p2p.json/p2p.am)

- Post an Automerge JSON based share file (i.e p2p.json/p2p.am):

```
freechains-json --host=serverhost:8330 commit #p2pforum p2p --sign=003030E0D03030D...
```

- Communicate with other peers:
   - Start another `freechains` host.
   - Join the same private chain `#p2pforum`.
   - Synchronize with the first host.

```
freechains-host --port=8331 start /home/pi/servers/distsys
# switch to another terminal
freechains --host=localhost:8331 chains join '#p2pforum' 96700A... # type same key
C40DBB...
freechains --host=localhost:8330 peer localhost:8331 send '#p2pforum'
```

The last command sends all new posts from `8330` to `8331`.

- Create an identity:

```
freechains crypto pubpvt "secret password" # creates two keys, public and private
003030E0D03030DEF5DC264DF87D5FEE45FF15E2A880708AE40675C9AD039E
```

- Checking out of the actual content of the public forum

```
freechains-json --host=serverhost:8330 commit checkout #p2pforum p2p
```

- Use the AM editor to edit the automerge file resulting of checkout (in our example, p2p/json/p2p.am), changing/including/deleting something.

- Post the Automerge JSON based share file (i.e p2p.json/p2p.am):

```
freechains-json --host=serverhost:8331 commit #p2pforum p2p --sign=003030E0D03030D...
```

- Sends and receives all new posts from `8331` to `8330`.

```
freechains --host=localhost:8331 peer localhost:8330 send '#p2pforum'
freechains --host=localhost:8331 peer localhost:8330 recv '#p2pforum'
```

