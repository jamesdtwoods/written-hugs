import React, { useEffect } from "react";
import { useHistory } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import PitchCategory from "../PitchCategory/PitchCategory";
import './CreatePitchPage.css';

export default function CreatePitchPage() {
    const history = useHistory();
    const dispatch = useDispatch();
    const cardsByCategory = useSelector(store => store.cardsReducer.cardsListByCategory);
    const newPitch = useSelector(store => store.pitches.newPitch);

    useEffect(() => {
        dispatch({ type: "SAGA/FETCH_CARDS_BY_CATEGORY" });
    }, []);

    const toReview = () => {
        history.push("/reviewPitch");
    }

    return (
        <div className='container'>
            <div className='wholesalerBar'>
                <h1>Create New Pitch</h1>
                <button className='pageButton' onClick = {toReview}> 🛒 Review Pitch (#)</button>
            </div>
            {cardsByCategory.map((x) => {
                return <PitchCategory categoryContents={x}/>
            })}
        </div>
    )
}