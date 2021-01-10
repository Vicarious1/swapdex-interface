import { createAction } from '@reduxjs/toolkit'
import { BurnField } from "../../../../util/types"

export const typeInput = createAction<{ field: BurnField; typedValue: string }>('burn/typeInputBurn')
