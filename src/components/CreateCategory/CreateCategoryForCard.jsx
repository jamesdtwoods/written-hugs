import { useState } from "react";
import { Button, Alert } from "@mui/material";
import { ArrowBackIos } from "@mui/icons-material";
import { useDispatch } from "react-redux";

export default function CreateCategoryForCard({ handleClose, card }) {
    let [categoryName, setCategoryName] = useState('');
    const [showAlert, setShowAlert] = useState(false);
    const dispatch = useDispatch();

    // User hits submit button, POSTs a new category, closes modal
    async function handleSubmit(e) {
        e.preventDefault();
        // Do the dispatch
        await dispatch({
            type: 'SAGA/POST_CARD_CATEGORY',
            payload: {
                name: categoryName,
                card: card
            }
        })
        setShowAlert(true);
        setCategoryName('');
        handleClose();
    };

    return (
        <div className='modalContainerSmall'>
            <div className='smallModalBar'>
                <div className='modalBack'>
                    <Button
                        variant="outlined"
                        startIcon={<ArrowBackIos />}
                        onClick={handleClose}
                    >
                        Back
                    </Button>
                </div>
                <h1>Create Category FOR CARD</h1>
            </div>

            {showAlert && <Alert severity='success'>Category successfully created</Alert>}
            <div className='smallModalForm'>
                <form>
                    <input
                        value={categoryName}
                        label="Category Name"
                        placeholder="Category Name"
                        onChange={(event) => setCategoryName(event.target.value)}
                        id="category"
                    />
                    <Button variant='contained' type="submit" onClick={handleSubmit}>Add Category</Button>
                </form>
            </div>
        </div>
    )
}