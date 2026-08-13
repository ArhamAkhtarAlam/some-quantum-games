# quantum.bin

Game randomness. Every `qRandInt` call in the site reads from this file.

## Where it came from

10 qubits × 204,683 measurements on a quantum computer (`qubit_*_sequence.npy`,
also bundled in the `lightrider` pip package).

## Why it isn't the raw bits

Every qubit came out biased toward |0⟩ — 49.12% ones overall, z = −25 against a
fair coin, so a real effect rather than noise. T1 relaxation decays |1⟩ during
readout. Per-qubit bias ranged from 0.10pp (qubit_1) to 3.38pp (qubit_8).

Serial correlation was ~0 (−0.0002), so the bits are independent, just weighted.

A von Neumann extractor fixes that exactly: read pairs, `01`→0, `10`→1, discard
`00` and `11`. Costs 75% of the bits and cares nothing about how biased the
source was.

| | bits | ones |
|---|---|---|
| raw | 2,046,830 | 49.1176% |
| after extraction | 511,736 | 50.0866% |

63,967 bytes. Byte histogram is flat (χ² = 304 on 255 df).

## Regenerating

```python
import numpy as np
raw = np.concatenate([np.load(f'qubit_{i}_sequence.npy').astype(np.uint8) for i in range(10)])
pairs = raw[:len(raw)//2*2].reshape(-1, 2)
bits = pairs[pairs[:, 0] != pairs[:, 1]][:, 0]
np.packbits(bits[:len(bits)//8*8]).tofile('data/quantum.bin')
```
