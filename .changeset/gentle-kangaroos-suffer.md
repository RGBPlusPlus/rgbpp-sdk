---
'@rgbpp-sdk/ckb': patch
---

fix: paginate get_cells to handle RPC limit

Implement pagination for `get_cells` to handle the RPC response limit. This ensures all cells can be collected regardless of the total number available.