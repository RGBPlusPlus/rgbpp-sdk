import {
  PERSONAL,
  addressToScript,
  blake2b,
  hexToBytes,
  rawTransactionToHash,
  scriptToHash,
  serializeInput,
  serializeScript,
  serializeWitnessArgs,
} from '@nervosnetwork/ckb-sdk-utils';
import signWitnesses from '@nervosnetwork/ckb-sdk-core/lib/signWitnesses';
import { RawClusterData, packRawClusterData, SporeDataProps, packRawSporeData } from '@spore-sdk/core';
import { remove0x, u64ToLe } from './hex';
import {
  CKB_UNIT,
  UNLOCKABLE_LOCK_SCRIPT,
  getClusterTypeScript,
  getSporeTypeScript,
  getTokenMetadataTypeScript,
  getUtxoAirdropBadgeTypeScript,
  getXudtTypeScript,
} from '../constants';
import { Hex, IndexerCell, RgbppTokenInfo } from '../types';
import { encodeRgbppTokenInfo, genBtcTimeLockScript } from './rgbpp';
import { Collector } from '../collector';
import { NoLiveCellError } from '../error';
import { CompatibleXUDTRegistry } from './cell-dep';

export { serializeScript };

export const calculateTransactionFee = (txSize: number, feeRate?: bigint): bigint => {
  const rate = feeRate ?? BigInt(1100);
  const ratio = BigInt(1000);
  const base = BigInt(txSize) * rate;
  const fee = base / ratio;
  return fee * ratio < base ? fee + BigInt(1) : fee;
};

export const isUtxoAirdropBadgeType = (type: CKBComponents.Script, isMainnet: boolean): boolean => {
  const utxoAirdropBadgeType = serializeScript(getUtxoAirdropBadgeTypeScript(isMainnet));
  const typeAsset = serializeScript({
    ...type,
    args: '',
  });
  return utxoAirdropBadgeType === typeAsset;
};

export const isTokenMetadataType = (type: CKBComponents.Script, isMainnet: boolean): boolean => {
  const tokenMetadataType = serializeScript(getTokenMetadataTypeScript(isMainnet));
  const typeAsset = serializeScript({
    ...type,
    args: '',
  });
  return tokenMetadataType === typeAsset;
};

//
/**
 * Checks if the provided UDT (User Defined Token) type script is supported by comparing it against a list of compatible UDT types.
 * If you want to get the latest compatible xUDT list, CompatibleXUDTRegistry.refreshCache should be called before the isCompatibleUDTTypesSupported
 *
 * @param type - The UDT type script to check for compatibility.
 * @param offline - Whether to use the offline mode.
 * @returns A boolean indicating whether the provided UDT type script is supported.
 */
export const isCompatibleUDTTypesSupported = (type: CKBComponents.Script, offline?: boolean): boolean => {
  const compatibleList = CompatibleXUDTRegistry.getCompatibleTokens(offline);
  const compatibleXudtTypeBytes = compatibleList.map((script) => serializeScript(script));
  const typeAsset = serializeScript({
    ...type,
    args: '',
  });
  return compatibleXudtTypeBytes.includes(typeAsset);
};

export const isStandardUDTTypeSupported = (type: CKBComponents.Script, isMainnet: boolean): boolean => {
  const xudtType = serializeScript(getXudtTypeScript(isMainnet));
  const typeAsset = serializeScript({
    ...type,
    args: '',
  });
  return xudtType === typeAsset;
};

export const isUDTTypeSupported = (type: CKBComponents.Script, isMainnet: boolean, offline?: boolean): boolean => {
  return isStandardUDTTypeSupported(type, isMainnet) || isCompatibleUDTTypesSupported(type, offline);
};

export const isSporeTypeSupported = (type: CKBComponents.Script, isMainnet: boolean): boolean => {
  const sporeType = serializeScript(getSporeTypeScript(isMainnet));
  const typeAsset = serializeScript({
    ...type,
    args: '',
  });
  return sporeType === typeAsset;
};

export const isClusterSporeTypeSupported = (type: CKBComponents.Script, isMainnet: boolean): boolean => {
  const typeAsset = serializeScript({
    ...type,
    args: '',
  });
  const clusterType = serializeScript(getClusterTypeScript(isMainnet));
  return isSporeTypeSupported(type, isMainnet) || clusterType === typeAsset;
};

export const isTypeAssetSupported = (type: CKBComponents.Script, isMainnet: boolean, offline?: boolean): boolean => {
  return isUDTTypeSupported(type, isMainnet, offline) || isClusterSporeTypeSupported(type, isMainnet);
};

const CELL_CAPACITY_SIZE = 8;
const UDT_CELL_DATA_SIZE = 16;

// Assume the length of the lock script args cannot exceed 26 bytes. If it exceeds, an error will be thrown.
const LOCK_ARGS_HEX_MAX_SIZE = 26;
export const isLockArgsSizeExceeded = (args: Hex) => remove0x(args).length > LOCK_ARGS_HEX_MAX_SIZE * 2;

// The BTC_TIME_CELL_INCREASED_SIZE depends on the receiver lock script args whose length cannot exceed LOCK_ARGS_HEX_MAX_SIZE bytes
const BTC_TIME_CELL_INCREASED_SIZE = 95;

// For simplicity, we keep the capacity of the RGBPP cell the same as the BTC time cell
// minimum occupied capacity and assume UDT cell data size is 16bytes
/**
 * RGB_lock:
    code_hash: 
      RGB_lock
    args:
      out_index | bitcoin_tx_id
 */
const RGBPP_LOCK_SIZE = 32 + 1 + 36;
export const calculateRgbppCellCapacity = (xudtType?: CKBComponents.Script): bigint => {
  const typeArgsSize = xudtType ? remove0x(xudtType.args).length / 2 : 32;
  const udtTypeSize = 33 + typeArgsSize;
  const cellSize =
    RGBPP_LOCK_SIZE + udtTypeSize + CELL_CAPACITY_SIZE + UDT_CELL_DATA_SIZE + BTC_TIME_CELL_INCREASED_SIZE;
  return BigInt(cellSize) * CKB_UNIT;
};

// Minimum occupied capacity and 1 ckb for transaction fee
// Assume UDT cell data size is 16bytes
// The default length of xut type args is 32 bytes
const DEFAULT_UDT_ARGS_SIZE = 32;
export const calculateUdtCellCapacity = (lock: CKBComponents.Script, udtType?: CKBComponents.Script): bigint => {
  const lockArgsSize = remove0x(lock.args).length / 2;
  const typeArgsSize = udtType ? remove0x(udtType.args).length / 2 : DEFAULT_UDT_ARGS_SIZE;
  const lockSize = 33 + lockArgsSize;
  const typeSize = 33 + typeArgsSize;
  const cellSize = lockSize + typeSize + CELL_CAPACITY_SIZE + UDT_CELL_DATA_SIZE;
  return BigInt(cellSize + 1) * CKB_UNIT;
};

// Unique Type Script: https://github.com/ckb-cell/unique-cell?tab=readme-ov-file#unique-type-script
export const calculateXudtTokenInfoCellCapacity = (tokenInfo: RgbppTokenInfo, lock: CKBComponents.Script): bigint => {
  const lockSize = remove0x(lock.args).length / 2 + 33;
  const cellDataSize = remove0x(encodeRgbppTokenInfo(tokenInfo)).length / 2;
  const uniqueTypeSize = 32 + 1 + 20;
  const cellSize = lockSize + uniqueTypeSize + CELL_CAPACITY_SIZE + cellDataSize;
  return BigInt(cellSize) * CKB_UNIT;
};

// Unique Type Script: https://github.com/ckb-cell/unique-cell?tab=readme-ov-file#unique-type-script
export const calculateRgbppTokenInfoCellCapacity = (tokenInfo: RgbppTokenInfo, isMainnet: boolean): bigint => {
  const btcTimeLock = genBtcTimeLockScript(UNLOCKABLE_LOCK_SCRIPT, isMainnet);
  const lockSize = remove0x(btcTimeLock.args).length / 2 + 33;
  const cellDataSize = remove0x(encodeRgbppTokenInfo(tokenInfo)).length / 2;
  const typeSize = 32 + 1 + 20;
  const cellSize = lockSize + typeSize + CELL_CAPACITY_SIZE + cellDataSize;
  return BigInt(cellSize) * CKB_UNIT;
};

// Generate type id for Unique type script args
export const generateUniqueTypeArgs = (firstInput: CKBComponents.CellInput, firstOutputIndex: number) => {
  const input = hexToBytes(serializeInput(firstInput));
  const s = blake2b(32, null, null, PERSONAL);
  s.update(input);
  s.update(hexToBytes(`0x${u64ToLe(BigInt(firstOutputIndex))}`));
  return `0x${s.digest('hex').slice(0, 40)}`;
};

// https://docs.spore.pro/recipes/Create/create-private-cluster
// Minimum occupied capacity and 1 ckb for transaction fee
export const calculateRgbppClusterCellCapacity = (clusterData: RawClusterData): bigint => {
  const clusterDataSize = packRawClusterData(clusterData).length;
  const clusterTypeSize = 32 + 1 + 32;
  const cellSize = RGBPP_LOCK_SIZE + clusterTypeSize + CELL_CAPACITY_SIZE + clusterDataSize;
  return BigInt(cellSize + 1) * CKB_UNIT;
};

// https://docs.spore.pro/recipes/Create/create-clustered-spore
// For simplicity, we keep the capacity of the RGBPP cell the same as the BTC time cell
// minimum occupied capacity and 1 ckb for transaction fee
/**
 * rgbpp_spore_cell:
    lock: rgbpp_lock
    type: spore_type
    data: sporeData
 */
export const calculateRgbppSporeCellCapacity = (sporeData: SporeDataProps): bigint => {
  const sporeDataSize = packRawSporeData(sporeData).length;
  const sporeTypeSize = 32 + 1 + 32;
  const cellSize = RGBPP_LOCK_SIZE + sporeTypeSize + CELL_CAPACITY_SIZE + sporeDataSize + BTC_TIME_CELL_INCREASED_SIZE;
  return BigInt(cellSize + 1) * CKB_UNIT;
};

// Calculate the occupied capacity of the CKB cell
export const calculateCellOccupiedCapacity = (cell: IndexerCell): bigint => {
  const cellDataSize = remove0x(cell.outputData).length / 2;
  const lockSize = remove0x(cell.output.lock.args).length / 2 + 1 + 32;
  const typeSize = cell.output.type ? remove0x(cell.output.type.args).length / 2 + 1 + 32 : 0;
  const cellSize = cellDataSize + lockSize + typeSize + CELL_CAPACITY_SIZE;
  return BigInt(cellSize) * CKB_UNIT;
};

export const deduplicateList = (rgbppLockArgsList: Hex[]): Hex[] => {
  return Array.from(new Set(rgbppLockArgsList));
};

// Compare the whole script
export const isScriptEqual = (s1: Hex | CKBComponents.Script, s2: Hex | CKBComponents.Script) => {
  const temp1 = typeof s1 === 'string' ? remove0x(s1) : remove0x(serializeScript(s1));
  const temp2 = typeof s2 === 'string' ? remove0x(s2) : remove0x(serializeScript(s2));
  return temp1 === temp2;
};

/**
 * Check whether the capacity of inputs is sufficient for outputs
 * @param ckbTx CKB raw transaction
 * @param collector The collector that collects CKB live cells and transactions
 * @returns When the capacity of inputs is sufficient for outputs, return true, otherwise return false
 */
export const checkCkbTxInputsCapacitySufficient = async (
  ckbTx: CKBComponents.RawTransaction,
  collector: Collector,
): Promise<boolean> => {
  let sumInputsCapacity = BigInt(0);
  for await (const input of ckbTx.inputs) {
    const liveCell = await collector.getLiveCell(input.previousOutput!);
    if (!liveCell) {
      throw new NoLiveCellError('The cell with the specific out point is dead');
    }
    sumInputsCapacity += BigInt(liveCell.output.capacity);
  }
  const sumOutputsCapacity = ckbTx.outputs
    .map((output) => BigInt(output.capacity))
    .reduce((prev, current) => prev + current, BigInt(0));
  return sumInputsCapacity > sumOutputsCapacity;
};

export function signCkbTransaction(
  key: string | Map<string, string>,
  ckbTx: CKBComponents.RawTransactionToSign,
  inputCells: { outPoint: CKBComponents.OutPoint; lock: CKBComponents.Script }[] = [],
  skipMissingKeys = false,
) {
  if (key instanceof Map && inputCells.length === 0) {
    throw new Error('inputCells must not be empty when using Map of keys');
  }

  const transactionHash = rawTransactionToHash(ckbTx);
  const signedWitnesses = signWitnesses(key)({
    transactionHash,
    witnesses: ckbTx.witnesses,
    inputCells,
    skipMissingKeys,
  });

  // Serialize the witness args if needed to ensure all witnesses are consistently in string format
  return {
    ...ckbTx,
    witnesses: signedWitnesses.map((witness) =>
      typeof witness !== 'string' ? serializeWitnessArgs(witness) : witness,
    ),
  };
}

export const addressToScriptHash = (address: string) => {
  const script = addressToScript(address);
  return scriptToHash(script);
};
