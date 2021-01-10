import { createReducer } from '@reduxjs/toolkit'
import { replaceSwapState, selectCurrency, setRecipient, switchCurrencies, typeInput } from './actions'

import { SwapState, SwapField } from '../../../../util/types'

const initialState: SwapState = {
  independentField: SwapField.INPUT,
  typedValue: '',
  [SwapField.INPUT]: {
    currencyId: ''
  },
  [SwapField.OUTPUT]: {
    currencyId: ''
  },
  recipient: null
}

export default createReducer<SwapState>(initialState, builder =>
  builder
    .addCase(
      replaceSwapState,
      (state, { payload: { typedValue, recipient, field, inputCurrencyId, outputCurrencyId } }) => {
        return {
          [SwapField.INPUT]: {
            currencyId: inputCurrencyId
          },
          [SwapField.OUTPUT]: {
            currencyId: outputCurrencyId
          },
          independentField: field,
          typedValue: typedValue,
          recipient
        }
      }
    )
    .addCase(selectCurrency, (state, { payload: { currencyId, field } }) => {
      const otherField = field === SwapField.INPUT ? SwapField.OUTPUT : SwapField.INPUT
      if (currencyId === state[otherField].currencyId) {
        // the case where we have to swap the order
        return {
          ...state,
          independentField: state.independentField === SwapField.INPUT ? SwapField.OUTPUT : SwapField.INPUT,
          [field]: { currencyId: currencyId },
          [otherField]: { currencyId: state[field].currencyId }
        }
      } else {
        // the normal case
        return {
          ...state,
          [field]: { currencyId: currencyId }
        }
      }
    })
    .addCase(switchCurrencies, state => {
      return {
        ...state,
        independentField: state.independentField === SwapField.INPUT ? SwapField.OUTPUT : SwapField.INPUT,
        [SwapField.INPUT]: { currencyId: state[SwapField.OUTPUT].currencyId },
        [SwapField.OUTPUT]: { currencyId: state[SwapField.INPUT].currencyId }
      }
    })
    .addCase(typeInput, (state, { payload: { field, typedValue } }) => {
      return {
        ...state,
        independentField: field,
        typedValue
      }
    })
    .addCase(setRecipient, (state, { payload: { recipient } }) => {
      state.recipient = recipient
    })
)
