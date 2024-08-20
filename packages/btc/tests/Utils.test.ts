import { describe, expect, it } from 'vitest';
import { bitcoin, decodeUtxoId, encodeUtxoId, transactionToHex } from '../src';

describe('Utils', () => {
  it('transactionToHex()', () => {
    const originalHex =
      '02000000000101177e673414fb4a393f0e1faf27a317d92e9f1a7b9a3ff36713d46ef5b7a1a6190100000000ffffffff020000000000000000226a20849f5b17209de17af5a94f0111e2ba03d1409da87a0f06894abb85b3b5024726df3c0f000000000016001462fc12a35b779f0cf7edcb9690be19b0386e0f9a024830450221009d869f20ef22864e02603571ce40da0586c03f20f5b8fb6295a4d636141d39dc02207082fdef40b34f6189491cba98c861ddfc8889d91c48f11f4660f11e93b1153b012103e1c38cf06691d449961d2b8f261a9a238c53da91d3a1e948497f7b1fe717968000000000';
    const tx = bitcoin.Transaction.fromHex(originalHex);

    const defaultHex = tx.toHex();
    const hexWithWitnesses = transactionToHex(tx, true);
    const hexWithoutWitnesses = transactionToHex(tx, false);

    expect(defaultHex).toEqual(originalHex);
    expect(defaultHex).toEqual(hexWithWitnesses);

    expect(hexWithoutWitnesses.length).toBeLessThan(hexWithWitnesses.length);
    expect(hexWithoutWitnesses).toEqual(
      '0200000001177e673414fb4a393f0e1faf27a317d92e9f1a7b9a3ff36713d46ef5b7a1a6190100000000ffffffff020000000000000000226a20849f5b17209de17af5a94f0111e2ba03d1409da87a0f06894abb85b3b5024726df3c0f000000000016001462fc12a35b779f0cf7edcb9690be19b0386e0f9a00000000',
    );
  });
  it('encodeUtxoId()', () => {
    expect(encodeUtxoId('0da44932270292fd3a4165f1f7ab81abf69b951e1e7d3b5c012e00a291c6b222', 0)).toEqual(
      '0da44932270292fd3a4165f1f7ab81abf69b951e1e7d3b5c012e00a291c6b222:0',
    );
    expect(encodeUtxoId('0x0da44932270292fd3a4165f1f7ab81abf69b951e1e7d3b5c012e00a291c6b222', 0)).toEqual(
      '0da44932270292fd3a4165f1f7ab81abf69b951e1e7d3b5c012e00a291c6b222:0',
    );
    expect(encodeUtxoId('0x0da44932270292fd3a4165f1f7ab81abf69b951e1e7d3b5c012e00a291c6b222', 0xffffffff)).toEqual(
      '0da44932270292fd3a4165f1f7ab81abf69b951e1e7d3b5c012e00a291c6b222:4294967295',
    );
    expect(() => encodeUtxoId('0da44932270292fd3a4165f1f7ab81abf69b951e1e7d3b5c012e00a291c6b22', 0)).toThrowError();
    expect(() =>
      encodeUtxoId('0da44932270292fd3a4165f1f7ab81abf69b951e1e7d3b5c012e00a291c6b222', 0xffffffff01),
    ).toThrowError();
  });
  it('decodeUtxoId()', () => {
    expect(decodeUtxoId('0da44932270292fd3a4165f1f7ab81abf69b951e1e7d3b5c012e00a291c6b222:0')).toStrictEqual({
      txid: '0da44932270292fd3a4165f1f7ab81abf69b951e1e7d3b5c012e00a291c6b222',
      vout: 0,
    });
    expect(decodeUtxoId('0da44932270292fd3a4165f1f7ab81abf69b951e1e7d3b5c012e00a291c6b222:4294967295')).toStrictEqual({
      txid: '0da44932270292fd3a4165f1f7ab81abf69b951e1e7d3b5c012e00a291c6b222',
      vout: 4294967295,
    });

    expect(() => decodeUtxoId('0x0da44932270292fd3a4165f1f7ab81abf69b951e1e7d3b5c012e00a291c6b222:0')).toThrowError();
    expect(() =>
      decodeUtxoId('0x0da44932270292fd3a4165f1f7ab81abf69b951e1e7d3b5c012e00a291c6b222:42949672951'),
    ).toThrowError();
  });
});
