const used = new Set([
  "proposalVotes",
  "didsWithClaims",
  "eventByIndexedArgs",
  "eventsByIndexedArgs",
  "transactionByHash proposals",
  "tokensByTrustedClaimIssuer",
  "tokensHeldByDid",
  "transactions",
  "scopesByIdentity",
  "issuerDidsWithClaimsByTarget",
  "proposal",
  "latestBlock",
  "heartbeat",
  "eventByAddedTrustedClaimIssuer",
  "settlements",
  "investments",
  "getWithholdingTaxesOfCA",
  "getHistoryOfPaymentEventsForCA",
  "tickerExternalAgentAdded",
  "tickerExternalAgentHistory",
  "tickerExternalAgentActions",
  "events",
  "getDidItnRewardActions",
]);

const all = [
  "heartbeat",
  "chainInfo",
  "latestBlock",
  "blocks",
  "blockById",
  "blockByHash",
  "events",
  "stashAccount",
  "stakingEventIds",
  "fromDate",
  "toDate",
  "count",
  "skip",
  "settlements",
  "eventByAddedTrustedClaimIssuer",
  "eventByIndexedArgs",
  "eventsByIndexedArgs",
  "transactions",
  "transactionByHash",
  "transactionById",
  "accountByAddress",
  "bridgedEventByTxHash",
  "polyxTransfersSent",
  "didsWithClaims",
  "issuerDidsWithClaimsByTarget",
  "scopesByIdentity",
  "tokensByTrustedClaimIssuer",
  "tokensHeldByDid",
  "polyxTransfersFailed",
  "polyxTransfersReceived",
  "tokenTransfersReceived",
  "tokenTransfersSent",
  "tokenTransfersFailed",
  "authorizations",
  "referendumVotes",
  "proposal",
  "proposals",
  "proposalVotes",
  "investments",
  "investmentsAggregated",
  "corporateActionsWithTicker",
  "corporateActionsWithCAId",
  "getWithholdingTaxesOfCA",
  "getHistoryOfPaymentEventsForCA",
  "getInstructionIdsForVenue",
  "getFundings",
  "getItnRewardRankings",
  "getDidItnRewardRanking",
  "getDidItnRewardActions",
  "updateItnRewardRankings",
  "getFailedBlocks",
];
const unused = new Set(all.filter((x) => !used.has(x)));
console.log(unused);
for (const u of unused) {
  console.log(u);
}
