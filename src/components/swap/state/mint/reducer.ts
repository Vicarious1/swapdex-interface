import { createReducer } from '@reduxjs/toolkit'
import { resetMintState, typeInput } from './actions'
import { MintState, MintField } from "../../../../util/types"

const initialState: MintState = {
  independentField: MintField.CURRENCY_A,
  typedValue: '',
  otherTypedValue: ''
}

export default createReducer<MintState>(initialState, builder =>
  builder
    .addCase(resetMintState, () => initialState)
    .addCase(typeInput, (state, { payload: { field, typedValue, noLiquidity } }) => {
      if (noLiquidity) {
        // they're typing into the field they've last typed in
        if (field === state.independentField) {
          return {
            ...state,
            independentField: field,
            typedValue
          }
        }
        // they're typing into a new field, store the other value
        else {
          return {
            ...state,
            independentField: field,
            typedValue,
            otherTypedValue: state.typedValue
          }
        }
      } else {
        return {
          ...state,
          independentField: field,
          typedValue,
          otherTypedValue: ''
        }
      }
    })
)
