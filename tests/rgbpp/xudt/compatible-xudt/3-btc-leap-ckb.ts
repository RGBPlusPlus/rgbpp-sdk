import { buildRgbppLockArgs, CompatibleXUDTRegistry } from 'rgbpp/ckb';
import { serializeScript } from '@nervosnetwork/ckb-sdk-utils';
import { genBtcJumpCkbVirtualTx, sendRgbppUtxos } from 'rgbpp';
import { isMainnet, collector, btcService, btcDataSource, btcAccount, BTC_TESTNET_TYPE, ckbAddress } from '../../env';
import { getFastestFeeRate, readStepLog } from '../../shared/utils';
import { saveCkbVirtualTxResult } from '../../../../examples/rgbpp/shared/utils';
import { signAndSendPsbt } from '../../../../examples/rgbpp/shared/btc-account';

interface LeapToCkbParams {
  rgbppLockArgsList: string[];
  toCkbAddress: string;
  compatibleXudtTypeScript: CKBComponents.Script;
  transferAmount: bigint;
}

const leapFromBtcToCKB = async ({
  rgbppLockArgsList,
  toCkbAddress,
  compatibleXudtTypeScript,
  transferAmount,
}: LeapToCkbParams) => {
  const { retry } = await import('zx');

  // Refresh the cache by fetching the latest compatible xUDT list from the specified URL.
  // The default URL is:
  // https://raw.githubusercontent.com/utxostack/typeid-contract-cell-deps/main/compatible-udt.json
  // You can set your own trusted URL to fetch the compatible xUDT list.
  // await CompatibleXUDTRegistry.refreshCache("https://your-own-trusted-compatible-xudt-url");
  await CompatibleXUDTRegistry.refreshCache();

  const feeRate = await getFastestFeeRate();
  console.log('feeRate = ', feeRate);

  await retry(120, '10s', async () => {
    const ckbVirtualTxResult = await genBtcJumpCkbVirtualTx({
      collector,
      rgbppLockArgsList,
      xudtTypeBytes: serializeScript(compatibleXudtTypeScript),
      transferAmount,
      toCkbAddress,
      isMainnet,
      btcTestnetType: BTC_TESTNET_TYPE,
      // btcConfirmationBlocks: 20, // default value is 6
    });

    // Save ckbVirtualTxResult
    saveCkbVirtualTxResult(ckbVirtualTxResult, '3-btc-leap-ckb');

    const { commitment, ckbRawTx } = ckbVirtualTxResult;

    // Send BTC tx
    const psbt = await sendRgbppUtxos({
      ckbVirtualTx: ckbRawTx,
      commitment,
      tos: [btcAccount.from],
      ckbCollector: collector,
      from: btcAccount.from,
      fromPubkey: btcAccount.fromPubkey,
      source: btcDataSource,
      feeRate: feeRate,
    });

    const { txId: btcTxId } = await signAndSendPsbt(psbt, btcAccount, btcService);
    console.log(`BTC ${BTC_TESTNET_TYPE} TxId: ${btcTxId}`);
    console.log(`explorer: https://mempool.space/testnet/tx/${btcTxId}`);

    await btcService.sendRgbppCkbTransaction({ btc_txid: btcTxId, ckb_virtual_result: ckbVirtualTxResult });

    try {
      const interval = setInterval(async () => {
        const { state, failedReason } = await btcService.getRgbppTransactionState(btcTxId);
        console.log('state', state);
        if (state === 'completed' || state === 'failed') {
          clearInterval(interval);
          if (state === 'completed') {
            const { txhash: txHash } = await btcService.getRgbppTransactionHash(btcTxId);
            console.info(
              `Rgbpp compatible xUDT asset has been jumped from BTC to CKB and the related CKB tx hash is ${txHash}`,
            );
            console.info(`explorer: https://pudge.explorer.nervos.org/transaction/${txHash}`);
          } else {
            console.warn(`Rgbpp CKB transaction failed and the reason is ${failedReason} `);
          }
        }
      }, 30 * 1000);
    } catch (error) {
      console.error(error);
    }
  });
};

// rgbppLockArgs: outIndexU32 + btcTxId
leapFromBtcToCKB({
  rgbppLockArgsList: [buildRgbppLockArgs(readStepLog('transfer-id').index, readStepLog('transfer-id').txid)],
  toCkbAddress: ckbAddress,
  compatibleXudtTypeScript: {
    codeHash: '0x1142755a044bf2ee358cba9f2da187ce928c91cd4dc8692ded0337efa677d21a',
    hashType: 'type',
    args: '0x878fcc6f1f08d48e87bb1c3b3d5083f23f8a39c5d5c764f253b55b998526439b',
  },
  transferAmount: BigInt(100_0000),
});
