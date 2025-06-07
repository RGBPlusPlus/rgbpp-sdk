import { describe, it, expect } from 'vitest';
import { Collector } from '.';
import { addressToScript, scriptToHash } from '@nervosnetwork/ckb-sdk-utils';

describe('collector', () => {
  const collector = new Collector({
    ckbNodeUrl: 'https://testnet.ckb.dev/rpc',
    ckbIndexerUrl: 'https://testnet.ckb.dev/indexer',
  });

  const collectorBatchRpcDisabled = new Collector({
    ckbNodeUrl: 'https://mainnet.ckbapp.dev/rpc',
    ckbIndexerUrl: 'https://mainnet.ckbapp.dev/indexer',
  });

  it('getLiveCell', async () => {
    const cell = await collector.getLiveCell({
      txHash: '0x8f8c79eb6671709633fe6a46de93c0fedc9c1b8a6527a18d3983879542635c9f',
      index: '0x0',
    });
    expect(cell.output.lock.codeHash).toBe('0x0000000000000000000000000000000000000000000000000000000000000000');
  });

  it('getLiveCells', async () => {
    const [cell1, cell2] = await collector.getLiveCells([
      //  Genesis block
      { txHash: '0x8f8c79eb6671709633fe6a46de93c0fedc9c1b8a6527a18d3983879542635c9f', index: '0x0' },
      // Nervos DAO
      { txHash: '0x8277d74d33850581f8d843613ded0c2a1722dec0e87e748f45c115dfb14210f1', index: '0x0' },
    ]);
    const [cell3, cell4] = await collectorBatchRpcDisabled.getLiveCells([
      //  Mainnet Genesis block
      { txHash: '0xe2fb199810d49a4d8beec56718ba2593b665db9d52299a0f9e6e75416d73ff5c', index: '0x0' },
      // Mainnet Nervos DAO
      { txHash: '0xe2fb199810d49a4d8beec56718ba2593b665db9d52299a0f9e6e75416d73ff5c', index: '0x2' },
    ]);
    expect(cell1.output.lock.codeHash).toBe('0x0000000000000000000000000000000000000000000000000000000000000000');
    expect(cell2.output.type?.codeHash).toBe('0x82d76d1b75fe2fd9a27dfbaa65a039221a380d76c926f378d3f81cf3e7e13f2e');
    expect(cell3.output.lock.codeHash).toBe('0x0000000000000000000000000000000000000000000000000000000000000000');
    expect(scriptToHash(cell4.output.type!)).toBe('0x82d76d1b75fe2fd9a27dfbaa65a039221a380d76c926f378d3f81cf3e7e13f2e');
  });

  it('getLiveCells should handle batch size correctly', async () => {
    const baseOutPoints = [
      //  Genesis block
      { txHash: '0x8f8c79eb6671709633fe6a46de93c0fedc9c1b8a6527a18d3983879542635c9f', index: '0x0' },
      // Nervos DAO
      { txHash: '0x8277d74d33850581f8d843613ded0c2a1722dec0e87e748f45c115dfb14210f1', index: '0x0' },
    ];
    const outPoints = Array(8).fill(baseOutPoints).flat();
    const cells = await collector.getLiveCells(outPoints);
    const baseOutPointsMainnet = [
      //  Mainnet Genesis block
      { txHash: '0xe2fb199810d49a4d8beec56718ba2593b665db9d52299a0f9e6e75416d73ff5c', index: '0x0' },
      // Mainnet Nervos DAO
      { txHash: '0xe2fb199810d49a4d8beec56718ba2593b665db9d52299a0f9e6e75416d73ff5c', index: '0x2' },
    ];
    const outPointsMainnet = Array(8).fill(baseOutPointsMainnet).flat();
    const cellsMainnet = await collectorBatchRpcDisabled.getLiveCells(outPointsMainnet);
    expect(cells.length).toBe(16);
    expect(cellsMainnet.length).toBe(16);
  });

  it('getLiveCells should return empty array for empty outPoints', async () => {
    const cells = await collector.getLiveCells([]);
    expect(cells).toEqual([]);
  });

  it('getCells should handle pagination correctly', async () => {
    const lock = addressToScript(
      'ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqfn7pyp489rjxcm69cpstvrk7l2dwd3zcgkmcpuw',
    );

    const cells = await collector.getCells({
      lock,
    });

    const uniqueCells = new Set(cells.map((cell) => `${cell.outPoint.txHash}-${cell.outPoint.index}`));
    expect(uniqueCells.size).toBe(cells.length);

    cells.forEach((cell) => {
      expect(cell.output.lock).toEqual(lock);
    });
  }, 30000);

  it('getCells should handle empty result', async () => {
    const nonExistentLock = {
      codeHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      hashType: 'type' as CKBComponents.ScriptHashType,
      args: '0x',
    };

    const cells = await collector.getCells({ lock: nonExistentLock });

    expect(Array.isArray(cells)).toBe(true);
    expect(cells.length).toBe(0);
  }, 30000);

  /* 
  pnpm run --filter "./packages/ckb" test collector.spec.ts -t "getCells"
  */
});
