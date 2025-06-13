import { IndexerCell } from '../types/collector';
import { Collector } from './index';
import { isScriptEqual } from '../utils/ckb-tx';
import { Hex } from '../types';

export class OfflineCollector extends Collector {
  private cells: IndexerCell[];

  constructor(cells: IndexerCell[]) {
    super({ ckbNodeUrl: '', ckbIndexerUrl: '' });
    this.cells = cells;
  }

  getCkb(): never {
    throw new Error('OfflineCollector does not have a CKB instance');
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
    let cells: IndexerCell[] = [];

    if (lock) {
      cells = this.cells.filter((cell) => {
        if (type) {
          return isScriptEqual(cell.output.lock, lock) && cell.output.type && isScriptEqual(cell.output.type, type);
        }
        return isScriptEqual(cell.output.lock, lock);
      });
    } else if (type) {
      cells = this.cells.filter((cell) => {
        if (!cell.output.type) {
          return false;
        }
        return isScriptEqual(cell.output.type, type);
      });
    }

    if (isDataMustBeEmpty && !type) {
      cells = cells.filter((cell) => cell.outputData === '0x' || cell.outputData === '');
    }

    if (outputCapacityRange) {
      if (outputCapacityRange.length === 2) {
        cells = cells.filter((cell) => {
          const capacity = BigInt(cell.output.capacity);
          return capacity >= BigInt(outputCapacityRange[0]) && capacity < BigInt(outputCapacityRange[1]);
        });
      } else {
        throw new Error('Invalid output capacity range');
      }
    }

    return cells.map((cell) => ({
      blockNumber: cell.blockNumber,
      outPoint: cell.outPoint,
      output: cell.output,
      outputData: cell.outputData,
      txIndex: cell.txIndex,
    }));
  }

  // https://github.com/nervosnetwork/ckb/blob/master/rpc/README.md#method-get_live_cell
  async getLiveCell(outPoint: CKBComponents.OutPoint, withData = true): Promise<CKBComponents.LiveCell> {
    const cell = this.cells.find((cell) => {
      return outPoint.txHash === cell.outPoint.txHash && outPoint.index === cell.outPoint.index;
    });
    if (!cell) {
      throw new Error(
        `Cell corresponding to the outPoint: {txHash: ${outPoint.txHash}, index: ${outPoint.index}} not found`,
      );
    }

    return {
      output: cell.output,
      data: withData
        ? {
            content: cell.outputData,
            hash: '', // not used, leave it empty for now
          }
        : undefined,
    };
  }

  async getLiveCells(outPoints: CKBComponents.OutPoint[], withData = false): Promise<CKBComponents.LiveCell[]> {
    return Promise.all(outPoints.map((outPoint) => this.getLiveCell(outPoint, withData)));
  }
}
