import React, { useState } from 'react';
import { connect, useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router';
import styled, { useTheme, withTheme } from 'styled-components';

import { ERC20_APP_BASE_PATH, UI_GENERAL_TITLE } from '../../../common/constants';
import { Logo } from '../../../components/common/logo';
import { separatorTopbar, ToolbarContainer } from '../../../components/common/toolbar';
import { NotificationsDropdownContainer } from '../../../components/notifications/notifications_dropdown';
import {
    changeSwapBaseToken,
    changeSwapQuoteToken,
    goToHome,
    goToHomeDefi,
    goToHomeMarketTrade,
    goToWallet,
    openFiatOnRampModal,
    openSideBar,
    setFiatType,
} from '../../../store/actions';
import {
    getBaseToken,
    getCurrentMarketPlace,
    getEthAccount,
    getGeneralConfig,
    getSwapBaseToken,
    getSwapQuoteToken,
} from '../../../store/selectors';
import { Theme, themeBreakPoints } from '../../../themes/commons';
import { isMobile } from '../../../util/screen';
import { MARKETPLACES } from '../../../util/types';
import { Button } from '../../common/button';
import { DropdownPositions } from '../../common/dropdown';
import { withWindowWidth } from '../../common/hoc/withWindowWidth';
import { LogoIcon } from '../../common/icons/logo_icon';
import { MenuBurguer } from '../../common/icons/menu_burguer';
import { SettingsDropdownContainer } from '../account/settings_dropdown';
import { WalletConnectionContentContainer } from '../account/wallet_connection_content';

import { MarketsDropdownStatsContainer } from './markets_dropdown_stats';
import { SwapDropdownContainer } from './swap_dropdown';
import { TransakWidget } from './transak_widget';

interface DispatchProps {
    onGoToHome: () => any;
    onGoToWallet: () => any;
    onGoToHomeMarketTrade: () => any;
    onGoToHomeDefi: () => any;
}

interface OwnProps {
    windowWidth: number;
}

type Props = DispatchProps & OwnProps;

const LogoHeader = styled(Logo)`
    ${separatorTopbar}
`;

const MarketsDropdownHeader = styled<any>(MarketsDropdownStatsContainer)`
    align-items: center;
    display: flex;

    ${separatorTopbar}
`;

const SwapDropdownHeader = styled<any>(SwapDropdownContainer)`
    align-items: center;
    display: flex;
`;

const WalletDropdown = styled(WalletConnectionContentContainer)`
    display: none;
    margin-left:1rem;
    border-radius: 1rem;
    padding: 1rem;
    border:1px solid transparent;

    @media (min-width: ${themeBreakPoints.sm}) {
        align-items: center;
        display: flex;

        ${separatorTopbar}
    }
    
    &:hover {
        border: 1px solid #ccc;
    }
`;

const StyledButton = styled(Button)`
    background-color: ${props => props.theme.componentsTheme.topbarBackgroundColor};
    color: ${props => props.theme.componentsTheme.textColorCommon};
    &:hover {
        text-decoration: underline;
    }
`;

const StyledLink = styled.a`
    align-items: center;
    margin-right: 17px;
    color: ${props => props.theme.componentsTheme.myWalletLinkColor};
    display: flex;
    font-size: 16px;
    font-weight: 600;
    text-decoration: none;
    &:hover {
        text-decoration: underline;
    }
`;

const MenuStyledButton = styled(Button)`
    background-color: ${props => props.theme.componentsTheme.topbarBackgroundColor};
    color: ${props => props.theme.componentsTheme.textColorCommon};
`;
const SwapStyledButton = styled(Button)`
    background-color: ${props => props.theme.componentsTheme.topbarBackgroundColor};
    color: ${props => props.theme.componentsTheme.textColorCommon};
    font-size: 25px;
`;

const StyledMenuBurguer = styled(MenuBurguer)`
    fill: ${props => props.theme.componentsTheme.textColorCommon};
`;

const ToolbarContent = (props: Props) => {
    const theme=useTheme();
    const [isEnableFiat, setIsEnableFiat] = useState(false);
    const generalConfig = useSelector(getGeneralConfig);
    const marketplace = useSelector(getCurrentMarketPlace);
    const baseSwapToken = useSelector(getSwapBaseToken);
    const quoteSwapToken = useSelector(getSwapQuoteToken);
    const walletAddress = useSelector(getEthAccount);
    const baseToken = useSelector(getBaseToken);
    const location = useLocation();
    const isHome = location.pathname === ERC20_APP_BASE_PATH || location.pathname === `${ERC20_APP_BASE_PATH}/`;

    console.log(theme);

    const logo = generalConfig && generalConfig.icon ? (
        <LogoIcon icon={theme.logo || generalConfig.icon}
            width={isMobile(window.innerWidth) ? '185px' : '200px'}/>
    ): null;
    const dispatch = useDispatch();
    const setOpenSideBar = () => {
        dispatch(openSideBar(true));
    };

    const handleFiatModal: React.EventHandler<React.MouseEvent> = e => {
        e.preventDefault();
        dispatch(setFiatType('CARDS'));
        dispatch(openFiatOnRampModal(true));
    };
    const handleTransakModal: React.EventHandler<React.MouseEvent> = e => {
        e.preventDefault();
        setIsEnableFiat(!isEnableFiat);
    };
    const onCloseTransakModal = () => {
        setIsEnableFiat(false);
    };

    const onClickSwap: React.EventHandler<React.MouseEvent> = e => {
        e.preventDefault();
        dispatch(changeSwapQuoteToken(baseSwapToken));
        dispatch(changeSwapBaseToken(quoteSwapToken));
    };

    const handleMarketTradeClick: React.EventHandler<React.MouseEvent> = e => {
        e.preventDefault();
        props.onGoToHomeMarketTrade();
    };

    const handleDexTradeClick: React.EventHandler<React.MouseEvent> = e => {
        e.preventDefault();
        props.onGoToHome();
    };

    const handleDefiClick: React.EventHandler<React.MouseEvent> = e => {
        e.preventDefault();
        props.onGoToHomeDefi();
    };

    const handleUSDXClick: React.EventHandler<React.MouseEvent> = e => {
        e.preventDefault();
    };

    const handleStakingClick: React.EventHandler<React.MouseEvent> = e => {
        e.preventDefault();
    };
    const handleFiatClick: React.EventHandler<React.MouseEvent> = e => {
        e.preventDefault();
    };
    const handleAnalyticsClick: React.EventHandler<React.MouseEvent> = e => {
        e.preventDefault();
    };

    let startContent;
    let endOptContent;

    if (isMobile(props.windowWidth)) {
        startContent = (
            <>
                <MenuStyledButton onClick={setOpenSideBar}>
                    <StyledMenuBurguer />
                </MenuStyledButton>
                <LogoHeader
                    image={logo}
                    width={'185px'}
                    onClick={handleDexTradeClick}
                />
            </>
        );
    } else {
        startContent = (
            <>
                <LogoHeader
                    image={logo}
                    onClick={handleDexTradeClick}
                    paddingLeft={'1rem'}
                />
                {/*!isHome*/}
                {/* <MyWalletLink href="/swap" onClick={handleMarketTradeClick} className={'market-trade'}>
                   Market Trade
                </MyWalletLink>*/}
            </>
        );
    }

    let endContent;
    if (isMobile(props.windowWidth)) {
        endContent = (
            <>
                <NotificationsDropdownContainer />
            </>
        );
    } else {
        endOptContent = (
            <>
                {/*  <SettingsContentContainer  className={'settings-dropdown'} /> */}
                {/*
                <StyledButton onClick={handleTransakModal} className={'buy-fiat'}>
                    FIAT
                </StyledButton>
                */}

                <StyledLink href="/dex" onClick={handleDexTradeClick} className={'market-trade'}>
                    DEX
                </StyledLink>
                <StyledLink href="/swap" onClick={handleMarketTradeClick} className={'market-trade'}>
                    Swap
                </StyledLink>
                <StyledLink href="/staking" onClick={handleStakingClick} className={'defi'}>
                    Staking
                </StyledLink>
                <StyledLink href="/defi" onClick={handleDefiClick} className={'defi'}>
                    DeFi
                </StyledLink>
                <StyledLink href="/usdx" onClick={handleUSDXClick} className={'defi'}>
                    USDX
                </StyledLink>
                <StyledLink href="/fiat-onramp" onClick={handleFiatModal} className={'defi'}>
                    Fiat
                </StyledLink>
                <StyledLink href="/analytics" onClick={handleAnalyticsClick} className={'defi'}>
                    Analytics
                </StyledLink>
                {/*
                <StyledButton onClick={handleFiatModal} className={'buy-eth'}>
                    Buy ETH
                </StyledButton>
                */}
                {isEnableFiat && (
                    <TransakWidget
                        walletAddress={walletAddress}
                        tokenSymbol={(baseToken && baseToken.symbol.toUpperCase()) || 'ETH'}
                        onClose={onCloseTransakModal}
                    />
                )}
            </>
        );

        endContent = (
            <>
                {/* <MyWalletLink href="/my-wallet" onClick={handleMyWalletClick} className={'my-wallet'}>
                    My Wallet
        </MyWalletLink> */}
                <SettingsDropdownContainer className={'settings-dropdown'} />
                <NotificationsDropdownContainer className={'notifications'} />
                <WalletDropdown className={'wallet-dropdown'} />
            </>
        );
    }

    return <ToolbarContainer startContent={startContent} endContent={endContent} endOptContent={endOptContent} />;
};

const mapDispatchToProps = (dispatch: any): DispatchProps => {
    return {
        onGoToHome: () => dispatch(goToHome()),
        onGoToWallet: () => dispatch(goToWallet()),
        onGoToHomeMarketTrade: () => dispatch(goToHomeMarketTrade()),
        onGoToHomeDefi: () => dispatch(goToHomeDefi()),
    };
};

const ToolbarContentContainer = withWindowWidth(connect(null, mapDispatchToProps)(ToolbarContent));

export { ToolbarContent, ToolbarContentContainer as default };
