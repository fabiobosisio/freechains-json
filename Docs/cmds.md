# Freechains-json: Command-Line Interface

- `freechains-json`

```
freechains-json v0.1.0

Automerge CRDT based JSON file upload utility for Freechains Networks

Usage:
    node freechains-json.js --host=localhost:8330 (opcional) commit <chain> <file_to_upload> --sign=<pvt> (opcional) --verbose (opcional)
    node freechains-json.js --host=localhost:8330 (opcional) checkout <chain> <file_to_download> --verbose (opcional)

Options:
    --verbose             verbose mode
    --host=<addr:port>    sets host address and port to connect [default: localhost:8330]
    --sign=<pvt>          signs post with given private key

More Information:

    https://github.com/fabiobosisio/freechains-json
```


## `commit`

Sends the Automerge JSON File to the Freechains chain:

```
node freechains-json.js --host=localhost:8330 (opcional) commit <chain> <file_to_upload> --sign=<pvt> (opcional) --verbose (opcional)

```
- Example:

```
node freechains-json.js --host=localhost:8330 (opcional) commit #p2p.json p2p.md.json --sign=003030E0D03030D (opcional) --verbose (opcional)
```

## `checkout`

It recomposes and downloads the complete content of the chain, and stores it in the local file indicated by parameter:

```
node freechains-json.js --host=localhost:8330 (opcional) checkout <chain> <file_to_download> --verbose (opcional)

```
- Example:

```
node freechains-json.js --host=localhost:8330 (opcional) checkout #p2p.json p2p.md.json --verbose (opcional)
```

