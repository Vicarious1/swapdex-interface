import { createReducer } from '@reduxjs/toolkit'
import { typeInput } from './actions'
import { BurnState, BurnField } from "../../../../util/types"

const initialState: BurnState = {
  independentField: BurnField.LIQUIDITY_PERCENT,
  typedValue: '0'
}

export default createReducer<BurnState>(initialState, builder =>
  builder.addCase(typeInput, (state, { payload: { field, typedValue } }) => {
    return {
      ...state,
      independentField: field,
      typedValue
    }
  })
)
