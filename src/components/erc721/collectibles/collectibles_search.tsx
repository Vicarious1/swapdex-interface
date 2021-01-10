import React, { useState } from 'react';

import { Theme } from '../../../themes/commons';
import { InputSearch } from '../common/input_search';
import { SearchModalContainer } from '../modals/search-modal';


export const CollectiblesSearch: React.FC<{}> = props => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const showModal = () => setIsModalOpen(true);
    const hideModal = () => setIsModalOpen(false);

    return (
        <>
            <InputSearch placeholder={'Search'} onClick={showModal} readOnly={true} focusOutline={false} />
            <SearchModalContainer isOpen={isModalOpen} onClose={hideModal}/>
        </>
    );
};
