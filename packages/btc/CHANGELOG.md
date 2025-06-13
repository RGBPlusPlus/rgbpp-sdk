# @rgbpp-sdk/btc

## 0.7.0

### Minor Changes

- [#293](https://github.com/utxostack/rgbpp-sdk/pull/293): Add offline btc data source & ckb collector ([@fghdotio](https://github.com/fghdotio))

### Patch Changes

- [#305](https://github.com/ckb-cell/rgbpp-sdk/pull/305): Upgrade ckb-sdk-js version ([@duanyytop](https://github.com/duanyytop))

## 0.6.0

### Minor Changes

- [#281](https://github.com/ckb-cell/rgbpp-sdk/pull/281): Upgrade ckb-sdk-js to fix esm and commonjs issues ([@duanyytop](https://github.com/duanyytop))

- [#246](https://github.com/ckb-cell/rgbpp-sdk/pull/246): Export ESM packages ([@duanyytop](https://github.com/duanyytop))

- [#272](https://github.com/ckb-cell/rgbpp-sdk/pull/272): Report TxBuilder as extra context in the TxBuildError when the BTC Builder APIs fail ([@ShookLyngs](https://github.com/ShookLyngs))

- [#270](https://github.com/ckb-cell/rgbpp-sdk/pull/270): Support for batch transferring of RGBPP XUDT assets ([@ShookLyngs](https://github.com/ShookLyngs))

  - Add `buildRgbppTransferAllTxs()` API in the rgbpp lib for generating one or more BTC/CKB transaction groups for transferring the entire amount of a specific type of RGBPP XUDT asset from one or more BTC addresses to a recipient
  - Add `sendRgbppTxGroups()` API in the rgbpp lib for sending BTC/CKB transaction groups to the `BtcAssetsApi`
  - Add `unpackRgbppLockArgs()` API in the ckb lib for unpacking the lock script args of an RGBPP Cell
  - Add `encodeCellId()` and `decodeCellId()` APIs in the ckb lib for handling the ID of a CKB Cell
  - Add `encodeUtxoId()` and `decodeUtxoId()` APIs in the btc lib for handling the ID of a BTC UTXO

### Patch Changes

- Updated dependencies [[`82d37ab`](https://github.com/ckb-cell/rgbpp-sdk/commit/82d37ab56fc2c2c1dd0437f44966380bae6c9b42), [`a2722c5`](https://github.com/ckb-cell/rgbpp-sdk/commit/a2722c535efa04c9a9a8147228c82957fe33143d), [`a31a376`](https://github.com/ckb-cell/rgbpp-sdk/commit/a31a3761056754fb6624ff571736cf18ccbdcd98), [`ec2a38e`](https://github.com/ckb-cell/rgbpp-sdk/commit/ec2a38ec5858380b2ca34de596d1eb98d1db4611)]:
  - @rgbpp-sdk/ckb@0.6.0
  - @rgbpp-sdk/service@0.6.0

## v0.5.0

### Minor Changes

- [#261](https://github.com/ckb-cell/rgbpp-sdk/pull/261): Batch fetch CKB RGB++ live cells to construct BTC transaction ([@duanyytop](https://github.com/duanyytop))

  - Batch fetch CKB RGB++ live cells to construct BTC transaction
  - Remove useless fields for RGB++ lock args list

### Patch Changes

- Updated dependencies [[`9afc2a9`](https://github.com/ckb-cell/rgbpp-sdk/commit/9afc2a911e6a4ba8a200755b01159b5b149e4010), [`8f99429`](https://github.com/ckb-cell/rgbpp-sdk/commit/8f99429de45899e5169771e87e73603318a49ae8), [`475b3c3`](https://github.com/ckb-cell/rgbpp-sdk/commit/475b3c35ab1a25ba3aae28123f2820460101c889)]:
  - @rgbpp-sdk/service@0.5.0
  - @rgbpp-sdk/ckb@0.5.0

## v0.4.0

### Minor Changes

- [#228](https://github.com/ckb-cell/rgbpp-sdk/pull/228): Support including multi-origin UTXOs in the same transaction ([@ShookLyngs](https://github.com/ShookLyngs))

  - Add `pubkeyMap` option in the sendUtxos(), sendRgbppUtxos() and sendRbf() API
  - Rename `inputsPubkey` option to `pubkeyMap` in the sendRbf() API
  - Delete `onlyProvableUtxos` option from the sendRgbppUtxos() API

- [#150](https://github.com/ckb-cell/rgbpp-sdk/pull/150): Support Full-RBF feature with the sendRbf() and createSendRbfBuilder() API ([@ShookLyngs](https://github.com/ShookLyngs))

  - Add `excludeUtxos`, `skipInputsValidation` options in the `sendUtxos()` API to support the RBF feature
  - Add `onlyProvableUtxos` option in the `sendRgbppUtxos()` API for future update supports
  - Add `changeIndex` in the return type of the BTC Builder APIs

### Patch Changes

- Updated dependencies [[`e5f41fd`](https://github.com/ckb-cell/rgbpp-sdk/commit/e5f41fd2b275182d2ab3fdf17e3b8853025fd2b9), [`6e840c1`](https://github.com/ckb-cell/rgbpp-sdk/commit/6e840c196fbece06430c559aebbdadaf7fb6e632)]:
  - @rgbpp-sdk/service@0.4.0
  - @rgbpp-sdk/ckb@0.4.0

## v0.3.0

### Minor Changes

- [#200](https://github.com/ckb-cell/rgbpp-sdk/pull/200): Add p-limit and batch queries in the sendRgbppUtxos() and TxBuilder.validateInputs() to improve construction time ([@ShookLyngs](https://github.com/ShookLyngs))

- [#208](https://github.com/ckb-cell/rgbpp-sdk/pull/208): Adapt btc-assets-api#154, adding new props and return values to the /balance and /unspent APIs ([@ShookLyngs](https://github.com/ShookLyngs))

- Add `available_satoshi` and `total_satoshi` to the BtcAssetsApi.getBtcBalance() API
- Add `only_non_rgbpp_utxos` to the props of the BtcAssetsApi.getBtcUtxos() API
- Remove `service.getRgbppAssetsByBtcUtxo()` lines from the DataCollector.collectSatoshi()
- Remove `hasRgbppAssets` related variables/function from the DataCache

- [#199](https://github.com/ckb-cell/rgbpp-sdk/pull/199): Add "needPaymaster" option to the sendRgbppUtxos() API to allow manually specifying whether a paymaster output is required ([@ShookLyngs](https://github.com/ShookLyngs))

### Patch Changes

- Updated dependencies [[`d2d963c`](https://github.com/ckb-cell/rgbpp-sdk/commit/d2d963c8f40d0316491df5bdccca4eba7a33977c), [`4c77e69`](https://github.com/ckb-cell/rgbpp-sdk/commit/4c77e69cadc8ce3d24f631c1348dcd7141fb1099), [`4f05b1b`](https://github.com/ckb-cell/rgbpp-sdk/commit/4f05b1bba898b7acb58bdf20ae275164ad94523b)]:
  - @rgbpp-sdk/ckb@0.3.0
  - @rgbpp-sdk/service@0.3.0

## v0.2.0

### Minor Changes

- [#184](https://github.com/ckb-cell/rgbpp-sdk/pull/184): Support query data caching internally in TxBuilder/DataSource, preventing query from the BtcAssetsApi too often when paying fee ([@ShookLyngs](https://github.com/ShookLyngs))

- [#165](https://github.com/ckb-cell/rgbpp-sdk/pull/165): Replace all "void 0" to "undefined" in the btc/service lib ([@ShookLyngs](https://github.com/ShookLyngs))

### Patch Changes

- [#166](https://github.com/ckb-cell/rgbpp-sdk/pull/166): Fix the message of INSUFFICIENT_UTXO error when collection failed ([@ShookLyngs](https://github.com/ShookLyngs))

- Updated dependencies [[`5e0e817`](https://github.com/ckb-cell/rgbpp-sdk/commit/5e0e8175a4c195e6491a37abedc755728c91cbed), [`a9b9796`](https://github.com/ckb-cell/rgbpp-sdk/commit/a9b9796f5ef8d27a9ad94d09a832bb9a7fe56c8e), [`9f9daa9`](https://github.com/ckb-cell/rgbpp-sdk/commit/9f9daa91486ca0cc1015713bd2648aa606da8717), [`299b404`](https://github.com/ckb-cell/rgbpp-sdk/commit/299b404217036feab409956d8888bfdc8fa820f4), [`e59322e`](https://github.com/ckb-cell/rgbpp-sdk/commit/e59322e7c6b9aff682bc1c8517337e3611dc122d), [`64c4312`](https://github.com/ckb-cell/rgbpp-sdk/commit/64c4312768885cb965285d41de99d023a4517ed3), [`1d58dd5`](https://github.com/ckb-cell/rgbpp-sdk/commit/1d58dd531947f4078667bb7294d2b3bb9351ead9), [`8cfc06e`](https://github.com/ckb-cell/rgbpp-sdk/commit/8cfc06e449c213868f103d9757f79f24521da280), [`4fcf4fa`](https://github.com/ckb-cell/rgbpp-sdk/commit/4fcf4fa6c0b20cf2fa957664a320f66601991817)]:
  - @rgbpp-sdk/ckb@0.2.0
  - @rgbpp-sdk/service@0.2.0

## v0.1.0

- Release @rgbpp-sdk/btc for RGBPP BTC-side transaction construction, providing APIs to send BTC or send RGBPP UTXO. Read the docs for more information: https://github.com/ckb-cell/rgbpp-sdk/tree/develop/packages/btc
