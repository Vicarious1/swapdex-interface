import React from 'react'
import styled from 'styled-components'
import { useLastTruthy } from './hooks/useLast'
import { AdvancedSwapDetails, AdvancedSwapDetailsProps } from './AdvancedSwapDetails'

const AdvancedDetailsFooter = styled.div`
  padding-top: calc(16px + 2rem);
  padding-bottom: 20px;
  max-width: 586px;
  min-width: 586px;
  border-radius: 20px;
  color: ${({ theme }) => theme.text2};
  background-color: #F5F6FA;
`

export default function AdvancedSwapDetailsDropdown({ trade, ...rest }: AdvancedSwapDetailsProps) {
  const lastTrade = useLastTruthy(trade)

  return (
    <AdvancedDetailsFooter>
        <AdvancedSwapDetails {...rest} trade={trade ?? lastTrade ?? undefined} />
    </AdvancedDetailsFooter>
  )
}
