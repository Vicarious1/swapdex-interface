import React from 'react'
import styled from 'styled-components'
import { useTranslation } from 'react-i18next'
import { NavLink, Link as HistoryLink } from 'react-router-dom'
import { ButtonPrimary } from '../Button';

import { ArrowLeft } from 'react-feather'
import { RowBetween } from '../Row'
import QuestionHelper from '../QuestionHelper'

const Tabs = styled.div`
  ${({ theme }) => theme.flexRowNoWrap}
  align-items: center;
  border-radius: 28px 28px 28px 28px;
  justify-content: space-between;
  background-color: #FFFFFF;
  width: 30%;
  font-family: 'Montserrat', sans-serif;
  -webkit-box-shadow: 0px 6px 10px rgba(0, 0, 0, 0.2);  /* Safari 3-4, iOS 4.0.2 - 4.2, Android 2.3+ */
  -moz-box-shadow: 0px 6px 10px rgba(0, 0, 0, 0.2);   /* Firefox 3.5 - 3.6 */
  box-shadow: 0px 6px 10px rgba(0, 0, 0, 0.2);

  :hover,
  :focus {
    background-color: #f4f9ff;
  }

  ${({ theme }) => theme.mediaWidth.upToMedium`
    width: 100%;
  `};
`

const activeClassName = 'ACTIVE'

const StyledNavLink = styled(NavLink).attrs({
  activeClassName
})`
  ${({ theme }) => theme.flexRowNoWrap}
  align-items: center;
  justify-content: center;
  height: 2.5rem;
  border-radius: 3rem;
  outline: none;
  cursor: pointer;
  text-decoration: none;
  color: #bd3085;
  font-size: 1em;
  width: 100%;

  &.${activeClassName} {
    font-weight: 500;
    color: #FFFFFF;
    background: linear-gradient(125deg,#b12d86,#f53e82);
  }

  ${({ theme }) => theme.mediaWidth.upToMedium`
    height: 2rem;
  `};
`

const ActiveText = styled.div`
  font-weight: 500;
  font-size: 20px;
`

const StyledArrowLeft = styled(ArrowLeft)`
  color: ${({ theme }) => theme.text1};
`

export function SwapPoolTabs({ active }: { active: 'swap' | 'pool' }) {
  const { t } = useTranslation()
  return (
    <Tabs style={{ marginBottom: '20px' }}>
      <StyledNavLink id={`swap-nav-link`} to={'/swap'} isActive={() => active === 'swap'}>
        {t('swap')}
      </StyledNavLink>
      <StyledNavLink id={`pool-nav-link`} to={'/pool'} isActive={() => active === 'pool'}>
        {t('pool')}
      </StyledNavLink>
    </Tabs>
  )
}

export function FindPoolTabs() {
  return (
    <Tabs>
      <RowBetween style={{ padding: '1rem' }}>
        <HistoryLink to="/pool">
          <StyledArrowLeft />
        </HistoryLink>
        <ActiveText>Import Pool</ActiveText>
        <QuestionHelper text={"Use this tool to find pairs that don't automatically appear in the interface."} />
      </RowBetween>
    </Tabs>
  )
}

export function AddRemoveTabs({ adding }: { adding: boolean }) {
  return (
    <ButtonPrimary style={{padding:'0', width:'50%'}}>
      <RowBetween style={{ padding: '1rem' }}>
        <HistoryLink to="/pool">
          <StyledArrowLeft />
        </HistoryLink>
        <ActiveText>{adding ? 'Add' : 'Remove'} Liquidity</ActiveText>
        <QuestionHelper
          text={
            adding
              ? 'When you add liquidity, you are given pool tokens representing your position. These tokens automatically earn fees proportional to your share of the pool, and can be redeemed at any time.'
              : 'Removing pool tokens converts your position back into underlying tokens at the current rate, proportional to your share of the pool. Accrued fees are included in the amounts you receive.'
          }
        />
      </RowBetween>
    </ButtonPrimary>
  )
}
