import { connectRouter } from 'connected-react-router';
import { History } from 'history';
import { combineReducers } from 'redux';
import { ActionType } from 'typesafe-actions';

import { StoreState } from '../util/types';

import { aave } from './aave/reducers';
import * as actions from './actions';
import { blockchain } from './blockchain/reducers';
import { bzx } from './bzx/reducers';
import { collectibles } from './collectibles/reducers';
import { market } from './market/reducers';
import { relayer } from './relayer/reducers';
import { swap as swapPage } from './swap/reducers';
import { ui } from './ui/reducers';

import application from '../components/swap/state/application/reducer'
import { updateVersion } from '../components/swap/state/global/actions'
import user from '../components/swap/state/user/reducer'
import transactions from '../components/swap/state/transactions/reducer'
import swap from '../components/swap/state/swap/reducer'
import mint from '../components/swap/state/mint/reducer'
import lists from '../components/swap/state/lists/reducer'
import burn from '../components/swap/state/burn/reducer'
import multicall from '../components/swap/state/multicall/reducer'

export type RootAction = ActionType<typeof actions>;

export const createRootReducer = (history: History) =>
    combineReducers<StoreState>({
        router: connectRouter(history),
        blockchain,
        relayer,
        ui,
        market,
        collectibles,
        bzx,
        aave,
        swapPage,
        application,
        user,
        transactions,
        swap,
        mint,
        burn,
        multicall,
        lists
    });
