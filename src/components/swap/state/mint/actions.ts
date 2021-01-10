import { createAction } from '@reduxjs/toolkit'
import { MintField } from "../../../../util/types"

export const typeInput = createAction<{ field: MintField; typedValue: string; noLiquidity: boolean }>('mint/typeInputMint')
export const resetMintState = createAction<void>('mint/resetMintState')
