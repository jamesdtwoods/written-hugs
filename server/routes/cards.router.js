const express = require('express');
const pool = require('../modules/pool');
const router = express.Router();

router.get('/categories', (req, res) => {
    const queryText = `
      SELECT * FROM "categories"
        ORDER BY "name" ASC;
    `;
    pool.query(queryText)
        .then(result => {
            res.send(result.rows);
        })
        .catch(err => {
            console.log('ERROR: Get all categories', err);
            res.sendStatus(500)
        })

});

router.get('/', (req, res) => {
    const queryText = `
    SELECT cards.id, cards.name, cards.category, cards."UPC", cards."SKU", cards.barcode, cards.front_img, cards.front_tiff, cards.inner_img, cards.insert_img, cards.insert_ai, cards.raw_art, cards.sticker_id, categories.name as category
    FROM cards
    JOIN cards_categories
    ON cards.id = cards_categories.card_id
    JOIN categories
    ON categories.id = cards_categories.category_id
    ORDER BY cards.id ASC;
    `;
    pool.query(queryText)
        .then((result) => {
            let theCards = formatCards(result.rows)
            res.send(theCards)
        })
        .catch(err => {
            console.log('ERROR: Get all cards', err);
            res.sendStatus(500)
        })
});

router.post('/', (req, res) => {
    const queryText = `
    INSERT INTO "cards" 
    ("name", "category", "description", "UPC", "SKU", "barcode", "front_img", "front_tiff", "inner_img", "insert_img", "insert_ai", "raw_art", "sticker_id")
    VALUES 
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING "id";
    `;
    const queryValues = [
        req.body.name,
        req.body.category,
        req.body.description,
        req.body.upc,
        req.body.sku,
        req.body.barcode,
        req.body.front_img,
        req.body.front_tiff,
        req.body.inner_img,
        req.body.insert_img,
        req.body.insert_ai,
        req.body.raw_art,
        req.body.sticker_id
    ];
    pool.query(queryText, queryValues)
        .then(result => {
            const card_id = result.rows[0].id
            const categoriesArray = req.body.categoriesArray
            const insertCardsCategoriesQuery = newCardsCategoriesQuery(categoriesArray, card_id);
            // SECOND QUERY ADDS categories FOR THAT NEW card
            pool.query(insertCardsCategoriesQuery)
                .then(result => {
                    //Now that both are done, send back success!
                    res.sendStatus(201);
                }).catch(err => {
                    // catch for second query
                    console.log(err);
                    res.sendStatus(500)
                })
        }).catch(err => { // 👈 Catch for first query
            console.log(err);
            res.sendStatus(500)
        })
})

// router.post('/', (req, res) => {
//     const queryText = `
//     INSERT INTO "clothes" 
//       ("name", "description", "user_id", "categories_id")
//     VALUES 
//       ($1, $2, $4, $3);
//     `;
//     const queryValues = [
//         req.body.item,
//         req.body.description,
//         req.body.categories_id,
//         req.user.id
//     ];
//     pool.query(queryText, queryValues)
//       .then((result) => { res.sendStatus(201); })
//       .catch((err) => {
//         console.log('Error in POST /api/clothes', err);
//         res.sendStatus(500);
//       });
//   });

// router.delete('/:id', (req, res) => {
//     const queryText = `
//       DELETE FROM clothes
//       WHERE id=$1;
//     `;
//     pool.query(queryText, [req.params.id])
//         .then(() => { res.sendStatus(200); })
//         .catch((err) => {
//         console.log('Error in DELETE /api/clothes/:id', err);
//         res.sendStatus(500);
//         });
// });

// router.put('/:id', (req, res) => {
//     const queryText = `
//       UPDATE "clothes"
//         SET 
//           "name"=$1, 
//           "description"=$2, 
//           "updated_date"=CURRENT_TIMESTAMP
//         WHERE
//           id=$3;
//     `;
//     const queryValues = [
//         req.body.name,
//         req.body.description,
//         req.params.id
//     ];

//     pool.query(queryText, queryValues)
//       .then((result) => { res.sendStatus(200); })
//       .catch((err) => {
//         console.log('Error in PUT /api/clothes/:id', err);
//         res.sendStatus(500);
//       });
//   });



/**  
 * this function takes in an array from the database 
 * it's goal is to bundle card records together with an array of categories
 * since a single card could have multiple categories
 * */
function formatCards(all) {
    // if array from database is empty, return empty array
    if (all[0] === undefined) {
        return [];
    } else {
        // create cardsArray with first response and first category
        let cardsArray = [{
            card_id: all[0].card_id,
            name: all[0].name,
            category: all[0].category,
            upc: all[0].upc,
            sku: all[0].sku,
            barcode: all[0].barcode,
            front_img: all[0].front_img,
            front_tiff: all[0].front_tiff,
            inner_img: all[0].inner_img,
            insert_img: all[0].insert_img,
            insert_ai: all[0].insert_ai,
            raw_art: all[0].raw_art,
            sticker_id: all[0].sticker_id,
            categoriesArray: [{
                clothes_id: all[0].clothes_id,
                name: all[0].name,
                description: all[0].description,
                categories_id: all[0].categories_id
            }]
        }]
        for (let i = 1; i < all.length; i++) {
            // if the card.id in the next index in the array does NOT match the previous index
            // then add the new card to the cardsArray
            if (all[i].card_id !== all[i - 1].card_id) {
                cardsArray.push({
                    card_id: all[i].card_id,
                    name: all[i].name,
                    category: all[i].category,
                    upc: all[i].upc,
                    sku: all[i].sku,
                    barcode: all[i].barcode,
                    front_img: all[i].front_img,
                    front_tiff: all[i].front_tiff,
                    inner_img: all[i].inner_img,
                    insert_img: all[i].insert_img,
                    insert_ai: all[i].insert_ai,
                    raw_art: all[i].raw_art,
                    sticker_id: all[i].sticker_id,
                    categoriesArray: []
                })
            }
            // if the card.id in the next index in the array DOES match the previous index
            // then add the other category to the card
            for (let j = 0; j < cardsArray.length; j++) {
                if (cardsArray[j].card_id === all[i].card_id) {
                    cardsArray[j].categoriesArray.push({
                        card_id: all[i].card_id,
                        name: all[i].name,
                        categories_id: all[i].categories_id
                    })
                }
            }
        }
        return cardsArray
    }
}

/**  
 * this function takes in an array of categories 
 * it's goal is to create a query to insert multiple rows in the cards_categories table
 * since a single card could have multiple categories
 * */
function newCardsCategoriesQuery(categoriesArray, card_id) {
    let cardsCategoriesQuery = `
    INSERT INTO "cards_categories"
    ("card_id", "category_id")
    VALUES
    `
    
    for (let i = 0; i < categoriesArray.length; i++) {
        // adds the appropriate ids
        if (i < categoriesArray.length - 1) {
            cardsCategoriesQuery += `
        (${card_id}, ${categoriesArray[i]}),
      `
        // adds the appropriate ids and a semi colon
        } else if (i === categoriesArray.length - 1) {
            cardsCategoriesQuery += `
        (${card_id}, ${categoriesArray[i]});
        `
        }
    }
    return cardsCategoriesQuery;
}


module.exports = router;