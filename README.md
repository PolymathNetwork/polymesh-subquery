# Polymesh Subquery

This project has been initially created to replace [the harvester](https://github.com/PolymathNetwork/polkascan-pre-harvester) meaning the output of both should match as much as possible, however since the harvester serializes chain objects in slightly different ways than polkadot-js, this project contains a list of special cases handled both at the initial deserialization level (in [project.yaml](project.yaml).network.types) and at the serialization level in [serializeLikeHarvester.ts](src/mappings/serializeLikeHarvester.ts).

## Running

1. In [docker-compose.yml](docker-compose.yml) file, set the following environment variables for `subquery-node` container -

- `NETWORK_ENDPOINT` - the wss endpoint of the blockchain to be indexed
- `NETWORK_CHAIN_ID` - network identifier of the blockchain. This value can be retrieved by going to PolkadotJS (opens new window)and looking for the hash on block 0 (genesis hash of the network)
- `START_BLOCK` - block from which indexing should start

3. Install subql cli: `npm i -g @subql/cli`
4. `rerun.sh` (requires docker compose)

## Using event_arg_x indexes.

The event_arg_x columns are now text, in order for them to fit in BTree indexes they are truncated to 100 characters like in the harvester.
This means that if you want to take advantage of the index in your query, you must use an expression like: `WHERE left(event_arg_x, 100) = 'foobar'`.
Otherwise using `WHERE event_arg_x = 'foobar'` will result in a full table scan.

## Debugging using the found_types table

The found_types table generated by subquery contains all types that have been serialized like the harvester, the actual type is in column ID which is the primary key and therefore unique and the raw type is in the raw_type column, if things break this is the first place to look for potential mismatches between types.

## Version

This SubQuery version works with chain version 5.0.0

### A note on handlers and NO_NATIVE_GRAPHQL_DATA mode

By setting the env variable "NO_NATIVE_GRAPHQL_DATA" this will set the event handler to only record what is necessary for tooling gql. This allows a stable indexer to be ran as native GraphQL handlers get developed
