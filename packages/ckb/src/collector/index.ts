import axios from 'axios';
import CKB from '@nervosnetwork/ckb-sdk-core';
import { CollectConfig, CollectResult, CollectUdtResult, IndexerCell } from '../types/collector';
import { MIN_CAPACITY } from '../constants';
import { CapacityNotEnoughError, IndexerError, UdtAmountNotEnoughError } from '../error';
import { isRgbppLockCellIgnoreChain, leToU128, remove0x, toCamelcase } from '../utils';
import { Hex } from '../types';

interface IndexerScript {
  code_hash: Hex;
  hash_type: Hex;
  args: Hex;
}

interface IndexerSearchKey {
  script?: IndexerScript;
  script_type?: 'lock' | 'type';
  script_search_mode?: 'prefix' | 'exact';
  filter?: {
    script?: IndexerScript;
    script_len_range?: Hex[];
    output_data_len_range?: Hex[];
    output_capacity_range?: Hex[];
    block_range?: Hex[];
  };
  with_data?: boolean;
}

const parseScript = (script: CKBComponents.Script): IndexerScript => ({
  code_hash: script.codeHash,
  hash_type: script.hashType,
  args: script.args,
});

export class Collector {
  private ckbNodeUrl: string;
  private ckbIndexerUrl: string;

  protected static GET_CELLS_PAGE_SIZE = 100;

  constructor({ ckbNodeUrl, ckbIndexerUrl }: { ckbNodeUrl: string; ckbIndexerUrl: string }) {
    this.ckbNodeUrl = ckbNodeUrl;
    this.ckbIndexerUrl = ckbIndexerUrl;
  }

  getCkb() {
    return new CKB(this.ckbNodeUrl);
  }

  async getCells({
    lock,
    type,
    isDataMustBeEmpty = true,
    outputCapacityRange,
  }: {
    lock?: CKBComponents.Script;
    type?: CKBComponents.Script;
    isDataMustBeEmpty?: boolean;
    outputCapacityRange?: Hex[];
  }): Promise<IndexerCell[]> {
    let searchKey: IndexerSearchKey = {};
    if (lock) {
      searchKey = {
        script_search_mode: 'exact',
        script: parseScript(lock),
        script_type: 'lock',
        filter: {
          script: type ? parseScript(type) : undefined,
          output_data_len_range: isDataMustBeEmpty && !type ? ['0x0', '0x1'] : undefined,
          output_capacity_range: outputCapacityRange,
        },
      };
    } else if (type) {
      searchKey = {
        script_search_mode: 'exact',
        script: parseScript(type),
        script_type: 'type',
      };
    }

    let allCells: IndexerCell[] = [];
    let lastCursor: string | undefined;
    let hasMoreCells = true;

    while (hasMoreCells) {
      const payload = {
        id: Math.floor(Math.random() * 100000),
        jsonrpc: '2.0',
        method: 'get_cells',
        params: [searchKey, 'asc', `0x${Collector.GET_CELLS_PAGE_SIZE.toString(16)}`, lastCursor],
      };
      const body = JSON.stringify(payload, null, '  ');
      const response = (
        await axios({
          method: 'post',
          url: this.ckbIndexerUrl,
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 20000,
          data: body,
        })
      ).data;

      if (response.error) {
        console.error(response.error);
        throw new IndexerError('Get cells from indexer error');
      }

      if (!response.result) {
        throw new IndexerError('Invalid response from indexer: result is empty');
      }

      const { objects, last_cursor: newLastCursor } = response.result;
      const res = toCamelcase<IndexerCell[]>(objects);
      if (res === null) {
        throw new IndexerError('The response of indexer RPC get_cells is invalid');
      }

      allCells = allCells.concat(res);

      if (!newLastCursor || objects.length < Collector.GET_CELLS_PAGE_SIZE) {
        hasMoreCells = false;
      }
      lastCursor = newLastCursor;
    }

    return allCells;
  }

  collectInputs(liveCells: IndexerCell[], needCapacity: bigint, fee: bigint, config?: CollectConfig): CollectResult {
    const changeCapacity = config?.minCapacity ?? MIN_CAPACITY;
    const inputs: CKBComponents.CellInput[] = [];
    let sumInputsCapacity = BigInt(0);
    const isRgbppLock = liveCells.length > 0 && isRgbppLockCellIgnoreChain(liveCells[0].output);
    for (const cell of liveCells) {
      inputs.push({
        previousOutput: {
          txHash: cell.outPoint.txHash,
          index: cell.outPoint.index,
        },
        since: '0x0',
      });
      sumInputsCapacity += BigInt(cell.output.capacity);
      if (sumInputsCapacity >= needCapacity + changeCapacity + fee && !isRgbppLock) {
        break;
      }
    }
    if (sumInputsCapacity < needCapacity + changeCapacity + fee) {
      const message = config?.errMsg ?? 'Insufficient free CKB balance';
      throw new CapacityNotEnoughError(message);
    }
    return { inputs, sumInputsCapacity };
  }

  collectUdtInputs({ liveCells, needAmount }: { liveCells: IndexerCell[]; needAmount: bigint }): CollectUdtResult {
    const inputs: CKBComponents.CellInput[] = [];
    let sumInputsCapacity = BigInt(0);
    let sumAmount = BigInt(0);
    const isRgbppLock = liveCells.length > 0 && isRgbppLockCellIgnoreChain(liveCells[0].output);
    for (const cell of liveCells) {
      if (cell.outputData === '0x') {
        continue;
      }
      inputs.push({
        previousOutput: {
          txHash: cell.outPoint.txHash,
          index: cell.outPoint.index,
        },
        since: '0x0',
      });
      sumInputsCapacity = sumInputsCapacity + BigInt(cell.output.capacity);
      // XUDT cell.data = <amount: uint128> <xudt data (optional)>
      // Ref: https://blog.cryptape.com/enhance-sudts-programmability-with-xudt#heading-xudt-cell
      sumAmount += leToU128(remove0x(cell.outputData).slice(0, 32));
      if (sumAmount >= needAmount && !isRgbppLock) {
        break;
      }
    }
    if (sumAmount < needAmount) {
      throw new UdtAmountNotEnoughError('Insufficient UDT balance');
    }
    return { inputs, sumInputsCapacity, sumAmount };
  }

  async getLiveCell(outPoint: CKBComponents.OutPoint, withData = true): Promise<CKBComponents.LiveCell> {
    const ckb = new CKB(this.ckbNodeUrl);
    const { cell } = await ckb.rpc.getLiveCell(outPoint, withData);
    return cell;
  }

  async getLiveCells(outPoints: CKBComponents.OutPoint[], withData = false): Promise<CKBComponents.LiveCell[]> {
    const ckb = new CKB(this.ckbNodeUrl);

    try {
      const batch = ckb.rpc.createBatchRequest(outPoints.map((outPoint) => ['getLiveCell', outPoint, withData]));
      const liveCells = await batch.exec();
      return liveCells.map((liveCell) => liveCell.cell);
    } catch (error) {
      console.warn(
        `batch RPC request failed: ${error instanceof Error ? error.message : 'Unknown error'}, using fallback implementation`,
      );
      const ckb = new CKB(this.ckbNodeUrl);
      const batchSize = 10;
      const liveCells: CKBComponents.LiveCell[] = [];

      for (let i = 0; i < outPoints.length; i += batchSize) {
        const outPointBatch = outPoints.slice(i, i + batchSize);
        const liveCellPromises = outPointBatch.map((outPoint) => ckb.rpc.getLiveCell(outPoint, withData));
        const liveCellResults = await Promise.all(liveCellPromises);
        liveCells.push(...liveCellResults.map((result) => result.cell));
      }

      return liveCells;
    }
  }
}

export class CollectorFactory {
  static createCollector({
    ckbNodeUrl,
    ckbIndexerUrl,
    pageSize,
  }: {
    ckbNodeUrl: string;
    ckbIndexerUrl: string;
    pageSize?: number;
  }): Collector {
    if (pageSize === undefined) {
      return new Collector({ ckbNodeUrl, ckbIndexerUrl });
    }

    if (pageSize <= 0) {
      throw new Error('Page size must be greater than 0');
    }

    return new (class extends Collector {
      protected static readonly GET_CELLS_PAGE_SIZE = pageSize as number;
    })({ ckbNodeUrl, ckbIndexerUrl });
  }
}
