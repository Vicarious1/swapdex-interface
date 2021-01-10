import { Currency, CurrencyAmount, Fraction, Percent } from '@uniswap/sdk'
import React from 'react'
import { Text } from 'rebass'
import { ButtonPrimary } from '../Button'
import { RowBetween, RowFixed } from '../Row'
import CurrencyLogo from '../CurrencyLogo'
import { MintField } from '../../../util/types'
import { TYPE } from '../theme'

export function ConfirmAddModalBottom({
  noLiquidity,
  price,
  currencies,
  parsedAmounts,
  poolTokenPercentage,
  onAdd
}: {
  noLiquidity?: boolean
  price?: Fraction
  currencies: { [field in MintField]?: Currency }
  parsedAmounts: { [field in MintField]?: CurrencyAmount }
  poolTokenPercentage?: Percent
  onAdd: () => void
}) {
  return (
    <>
      <RowBetween>
        <TYPE.body>{currencies[MintField.CURRENCY_A]?.symbol} Deposited</TYPE.body>
        <RowFixed>
          <CurrencyLogo currency={currencies[MintField.CURRENCY_A]} style={{ marginRight: '8px' }} />
          <TYPE.body>{parsedAmounts[MintField.CURRENCY_A]?.toSignificant(6)}</TYPE.body>
        </RowFixed>
      </RowBetween>
      <RowBetween>
        <TYPE.body>{currencies[MintField.CURRENCY_B]?.symbol} Deposited</TYPE.body>
        <RowFixed>
          <CurrencyLogo currency={currencies[MintField.CURRENCY_B]} style={{ marginRight: '8px' }} />
          <TYPE.body>{parsedAmounts[MintField.CURRENCY_B]?.toSignificant(6)}</TYPE.body>
        </RowFixed>
      </RowBetween>
      <RowBetween>
        <TYPE.body>Rates</TYPE.body>
        <TYPE.body>
          {`1 ${currencies[MintField.CURRENCY_A]?.symbol} = ${price?.toSignificant(4)} ${
            currencies[MintField.CURRENCY_B]?.symbol
          }`}
        </TYPE.body>
      </RowBetween>
      <RowBetween style={{ justifyContent: 'flex-end' }}>
        <TYPE.body>
          {`1 ${currencies[MintField.CURRENCY_B]?.symbol} = ${price?.invert().toSignificant(4)} ${
            currencies[MintField.CURRENCY_A]?.symbol
          }`}
        </TYPE.body>
      </RowBetween>
      <RowBetween>
        <TYPE.body>Share of Pool:</TYPE.body>
        <TYPE.body>{noLiquidity ? '100' : poolTokenPercentage?.toSignificant(4)}%</TYPE.body>
      </RowBetween>
      <ButtonPrimary style={{ margin: '20px 0 0 0' }} onClick={onAdd}>
        <Text fontWeight={500} fontSize={20}>
          {noLiquidity ? 'Create Pool & Supply' : 'Confirm Supply'}
        </Text>
      </ButtonPrimary>
    </>
  )
}
