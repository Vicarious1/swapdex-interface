import { createAction } from '@reduxjs/toolkit'
import { SwapField } from '../../../../util/types'

export const selectCurrency = createAction<{ field: SwapField; currencyId: string }>('swap/selectCurrency')
export const switchCurrencies = createAction<void>('swap/switchCurrencies')
export const typeInput = createAction<{ field: SwapField; typedValue: string }>('swap/typeInput')
export const replaceSwapState = createAction<{
  field: SwapField
  typedValue: string
  inputCurrencyId?: string
  outputCurrencyId?: string
  recipient: string | null
}>('swap/replaceSwapState')
export const setRecipient = createAction<{ recipient: string | null }>('swap/setRecipient')
