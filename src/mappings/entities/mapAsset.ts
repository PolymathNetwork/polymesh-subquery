import BigNumber from 'bignumber.js';
import { SubstrateExtrinsic } from '@subql/types';
import { ModuleIdEnum, CallIdEnum } from './common';
import { Asset, AssetHolder, Authorization, Settlement } from '../../types';
import { formatAssetIdentifiers } from '../util';

// #region Utils
const chainAmountToBigNumber = (amount: number): BigNumber =>
  new BigNumber(amount).div(new BigNumber(1000000));

const getAsset = async (ticker: string) => {
  const asset = await Asset.getByTicker(ticker);
  if (!asset) throw new Error(`Asset with ticker ${ticker} was not found.`);
  return asset;
};

const getSettlement = async (id: string) => {
  const settlement = await Settlement.get(id);
  if (!settlement) throw new Error(`Settlement with id ${id} was not found.`);
  return settlement;
};

const getAuthorization = async (id: string) => {
  const authorization = await Authorization.get(id);
  if (!authorization)
    throw new Error(`Authorization with id ${id} was not found.`);
  return authorization;
};

const getHolderAmount = (did: string, holders: AssetHolder[]) => {
  const holder = holders.find((h) => h.did === did);
  return holder ? new BigNumber(holder.amount) : new BigNumber(0);
};
// #endregion

// #region ModuleIdEnum.Asset
const handleCreateAsset = async (
  params: Record<string, any>,
  extrinsic: any,
) => {
  const {
    name,
    ticker,
    assetType: type,
    fundingRound,
    divisible,
    disableIu,
    identifiers,
  } = params;
  const ownerDid = extrinsic.events[1].event.data[0].toString();
  await Asset.create({
    id: ticker,
    ticker,
    name,
    type,
    fundingRound,
    isDivisible: divisible,
    isFrozen: false,
    isUniquenessRequired: !disableIu,
    documents: [],
    identifiers: formatAssetIdentifiers(identifiers),
    ownerDid,
    fullAgents: [ownerDid],
    holders: [],
    totalSupply: '0',
    totalTransfers: '0',
  }).save();
};

const handleRenameAsset = async (params: Record<string, any>) => {
  const { ticker, name: newName } = params;
  const asset = await getAsset(ticker);
  asset.name = newName;
  await asset.save();
};

const handleSetFundingRound = async (params: Record<string, any>) => {
  const { ticker, name: newFundingRound } = params;
  const asset = await getAsset(ticker);
  asset.fundingRound = newFundingRound;
  await asset.save();
};

type AssetNewDocument = {
  name: string;
  uri: string;
  content_hash?: any;
  doc_type?: string;
  filing_date?: Date;
};

const handleAddDocuments = async (
  params: Record<string, any>,
  extrinsic: any,
) => {
  const { ticker, docs } = params;
  const asset = await getAsset(ticker);
  asset.documents = docs.map((doc: AssetNewDocument, i: number) => ({
    id: Number(extrinsic.events[i].event.data[2].toString()),
    name: doc.name,
    link: doc.uri,
  }));
  await asset.save();
};

const handleRemoveDocuments = async (params: Record<string, any>) => {
  const { ticker, ids } = params;
  const asset = await getAsset(ticker);
  asset.documents = asset.documents.filter((doc) => !ids.includes(doc.id));
  await asset.save();
};

const handleUpdateIdentifiers = async (params: Record<string, any>) => {
  const { ticker, identifiers: newIdentifiers } = params;
  const asset = await getAsset(ticker);
  asset.identifiers = formatAssetIdentifiers(newIdentifiers);
  await asset.save();
};

const handleMakeDivisible = async (params: Record<string, any>) => {
  const { ticker } = params;
  const asset = await getAsset(ticker);
  asset.isDivisible = true;
  await asset.save();
};

const handleIssue = async (params: Record<string, any>) => {
  const { ticker, amount } = params;
  const asset = await getAsset(ticker);
  const formattedAmount = chainAmountToBigNumber(amount);
  const ownerAmount = getHolderAmount(asset.ownerDid, asset.holders);
  const otherHolders = asset.holders.filter((h) => h.did !== asset.ownerDid);
  asset.holders = [
    ...otherHolders,
    {
      did: asset.ownerDid,
      amount: ownerAmount.plus(formattedAmount).toString(),
    },
  ];
  asset.totalSupply = new BigNumber(asset.totalSupply)
    .plus(formattedAmount)
    .toString();
  await asset.save();
};

const handleRedeem = async (params: Record<string, any>) => {
  const { ticker, value: amount } = params;
  const asset = await getAsset(ticker);
  const formattedAmount = chainAmountToBigNumber(amount);
  const ownerAmount = getHolderAmount(asset.ownerDid, asset.holders);
  const otherHolders = asset.holders.filter((h) => h.did !== asset.ownerDid);
  asset.holders = [
    ...otherHolders,
    {
      did: asset.ownerDid,
      amount: ownerAmount.minus(formattedAmount).toString(),
    },
  ];
  asset.totalSupply = new BigNumber(asset.totalSupply)
    .minus(formattedAmount)
    .toString();
  await asset.save();
};

const handleFreeze = async (params: Record<string, any>) => {
  const { ticker } = params;
  const asset = await getAsset(ticker);
  asset.isFrozen = true;
  await asset.save();
};

const handleUnfreeze = async (params: Record<string, any>) => {
  const { ticker } = params;
  const asset = await getAsset(ticker);
  asset.isFrozen = false;
  await asset.save();
};

const handleAcceptAssetOwnershipTransfer = async (
  params: Record<string, any>,
) => {
  const { authId } = params;
  const authorization = await getAuthorization(authId);
  if (!authorization.ticker) return;
  const asset = await getAsset(authorization.ticker);
  asset.ownerDid = authorization.target;
  await asset.save();
  await Authorization.remove(authId);
};
// #endregion

// #region ModuleIdEnum.Settlement
const handleAddAndAffirmInstruction = async (
  params: Record<string, any>,
  extrinsic: any,
) => {
  const { legs } = params;
  await Settlement.create({
    id: Number(extrinsic.events[0].event.data[2].toString()),
    legs: legs.map((l: any) => ({
      from: l.from.did.toString(),
      to: l.to.did.toString(),
      ticker: l.asset.toString(),
      amount: chainAmountToBigNumber(l.amount).toString(),
    })),
  }).save();
};

const handleAffirmInstruction = async (params: Record<string, any>) => {
  const { instructionId } = params;
  const settlement = await getSettlement(instructionId);
  await Promise.all(
    settlement.legs.map(async (leg) => {
      const asset = await getAsset(leg.ticker);
      const settlementAmount = new BigNumber(leg.amount);
      const currentFromAmount = getHolderAmount(leg.from, asset.holders);
      const currentToAmount = getHolderAmount(leg.to, asset.holders);
      const otherHolders = asset.holders.filter(
        (h) => ![leg.from, leg.to].includes(h.did),
      );
      asset.holders = [
        ...otherHolders,
        {
          did: leg.from,
          amount: currentFromAmount.minus(settlementAmount).toString(),
        },
        {
          did: leg.to,
          amount: currentToAmount.plus(settlementAmount).toString(),
        },
      ];
      asset.totalTransfers = new BigNumber(asset.totalTransfers)
        .plus(new BigNumber(1))
        .toString();
      await asset.save();
    }),
  );
  await Settlement.remove(instructionId);
};

const handleRejectInstruction = async (params: Record<string, any>) => {
  const { instructionId } = params;
  await Settlement.remove(instructionId);
};
// #endregion

// #region ModuleIdEnum.Identity
const handleAddAuthorization = async (
  params: Record<string, any>,
  extrinsic: any,
) => {
  const { target: targetData, authorizationData } = params;
  const type = Object.keys(authorizationData)[0];
  const id = Number(extrinsic.events[0].event.data[3].toString());
  const target = targetData.Identity.toString();
  if (type === 'TransferAssetOwnership') {
    const ticker = authorizationData[type].toString();
    await Authorization.create({
      id,
      target,
      type,
      ticker,
    }).save();
  }
  if (type === 'BecomeAgent') {
    const ticker = authorizationData[type].col1.toString();
    const group = Object.keys(authorizationData[type].col2)[0];
    if (group === 'Full') {
      const prevOwner = extrinsic.events[0].event.data[0].toString();
      await Authorization.create({
        id,
        target,
        type,
        ticker,
        data: JSON.stringify({ group, prevOwner }),
      }).save();
    }
  }
};

const handleRemoveAuthorization = async (params: Record<string, any>) => {
  const { authId } = params;
  await Authorization.remove(authId);
};
// #endregion

// #region ModuleIdEnum.Externalagents
const handleAcceptBecomeAgent = async (params: Record<string, any>) => {
  const { authId } = params;
  const authorization = await getAuthorization(authId);
  const authorizationData = JSON.parse(authorization.data || '{}');
  if (!authorization.ticker || authorizationData.group !== 'Full') {
    return;
  }
  const asset = await getAsset(authorization.ticker);
  const previousOwner = authorizationData.prevOwner;
  const currentAgents = previousOwner
    ? asset.fullAgents.filter((a) => a !== previousOwner)
    : asset.fullAgents;
  asset.fullAgents = [...currentAgents, authorization.target];
  await asset.save();
  await Authorization.remove(authId);
};
// #endregion

const handleAsset = async (
  callId: CallIdEnum,
  params: Record<string, any>,
  extrinsic: any,
) => {
  if (callId === CallIdEnum.CreateAsset) {
    await handleCreateAsset(params, extrinsic);
  }
  if (callId === CallIdEnum.RenameAsset) {
    await handleRenameAsset(params);
  }
  if (callId === CallIdEnum.SetFundingRound) {
    await handleSetFundingRound(params);
  }
  if (callId === CallIdEnum.AddDocuments) {
    await handleAddDocuments(params, extrinsic);
  }
  if (callId === CallIdEnum.RemoveDocuments) {
    await handleRemoveDocuments(params);
  }
  if (callId === CallIdEnum.UpdateIdentifiers) {
    await handleUpdateIdentifiers(params);
  }
  if (callId === CallIdEnum.MakeDivisible) {
    await handleMakeDivisible(params);
  }
  if (callId === CallIdEnum.Issue) {
    await handleIssue(params);
  }
  if (callId === CallIdEnum.Redeem) {
    await handleRedeem(params);
  }
  if (callId === CallIdEnum.Freeze) {
    await handleFreeze(params);
  }
  if (callId === CallIdEnum.Unfreeze) {
    await handleUnfreeze(params);
  }
  if (callId === CallIdEnum.AcceptAssetOwnershipTransfer) {
    await handleAcceptAssetOwnershipTransfer(params);
  }
};

const handleSettlement = async (
  callId: CallIdEnum,
  params: Record<string, any>,
  extrinsic: any,
) => {
  if (callId === CallIdEnum.AddAndAffirmInstruction) {
    await handleAddAndAffirmInstruction(params, extrinsic);
  }
  if (callId === CallIdEnum.AffirmInstruction) {
    await handleAffirmInstruction(params);
  }
  if (callId === CallIdEnum.RejectInstruction) {
    await handleRejectInstruction(params);
  }
};

const handleIdentity = async (
  callId: CallIdEnum,
  params: Record<string, any>,
  extrinsic: any,
) => {
  if (callId === CallIdEnum.AddAuthorization) {
    await handleAddAuthorization(params, extrinsic);
  }
  if (callId === CallIdEnum.RemoveAuthorization) {
    await handleRemoveAuthorization(params);
  }
};

const handleExternalAgents = async (
  callId: CallIdEnum,
  params: Record<string, any>,
) => {
  if (callId === CallIdEnum.AcceptBecomeAgent) {
    await handleAcceptBecomeAgent(params);
  }
};

export async function mapAsset(
  blockId: number,
  callId: CallIdEnum,
  moduleId: ModuleIdEnum,
  params: Record<string, any>,
  extrinsic: SubstrateExtrinsic,
): Promise<void> {
  if (
    !extrinsic.success ||
    ![
      ModuleIdEnum.Asset,
      ModuleIdEnum.Settlement,
      ModuleIdEnum.Identity,
      ModuleIdEnum.Externalagents,
    ].includes(moduleId)
  ) {
    return;
  }
  if (moduleId === ModuleIdEnum.Asset) {
    await handleAsset(callId, params, extrinsic);
  }
  if (moduleId === ModuleIdEnum.Settlement) {
    await handleSettlement(callId, params, extrinsic);
  }
  if (moduleId === ModuleIdEnum.Identity) {
    await handleIdentity(callId, params, extrinsic);
  }
  if (moduleId === ModuleIdEnum.Externalagents) {
    await handleExternalAgents(callId, params);
  }
}
