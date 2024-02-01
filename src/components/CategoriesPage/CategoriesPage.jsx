
import { useState } from "react";
import { useHistory } from "react-router-dom";
import CategoriesList from "../CategoriesList/CategoriesList";
import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';
import './CategoriesPage.css';
import CreateCategory from '../CreateCategory/CreateCategory'

export default function CategoriesPage() {
    const history = useHistory();
    const [open, setOpen] = useState(false);
    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);
    const style = {
        position: 'absolute',
        overflow: 'scroll',
        display: 'block',
        width: '100%',
        height: '100%',
        bgcolor: 'background.paper',
    };

    return (
        <>
            <div className='container'>
                <div className='categoryBar'>
                    <h1>Categories</h1>
                    <button className='pageButton' onClick={handleOpen}>Add Category</button>
                </div>

                <CategoriesList />
            </div>
            <Modal
                open={open}
                onClose={handleClose}
                aria-labelledby="modal-modal-title"
                aria-describedby="modal-modal-description"
            >
                <Box sx={style}>
                    <CreateCategory handleClose={handleClose} />
                </Box>
            </Modal>
        </>
    )
}