const express = require('express');
const pool = require('../modules/pool');
const router = express.Router();
const { google } = require('googleapis')
const apikeys = require('../../googleDriveAPI.json')
const SCOPE = ["https://www.googleapis.com/auth/drive"];
const fs = require('fs')
// const jwtClient = require('../modules/googleDriveAuth')

/** This function first authorizes to google drive using the JWT api method
 * Then it makes an api get call to google drive to fetch files of 
 * the folder mimeType.  
 * It returns the folders.
 */
router.get('/folders', async (req, res) => {
    const jwtClient = new google.auth.JWT(
        apikeys.client_email,
        null,
        apikeys.private_key,
        SCOPE
    )
    console.log("jwtClient before authorize", jwtClient);
    await jwtClient.authorize()
    console.log("jwtClient after authorize", jwtClient);
    const drive = google.drive({ version: 'v3', auth: jwtClient });
    const folders = [];
    const results = await drive.files.list({
        q: 'mimeType=\'application/vnd.google-apps.folder\'',
        fields: 'nextPageToken, files(id, name)',
        spaces: 'drive',
    });
    console.log("this is the result", results.data.files);
    res.send(results.data.files);
}
)

router.get('/', (req, res) => {
    const queryText = `
    SELECT
        c.id,
        c.name,
        c.description, 
        c.vendor_style, 
        c.upc, 
        c.sku, 
        c.barcode, 
        c.front_img, 
        c.front_tiff, 
        c.inner_img, 
        c.insert_img, 
        c.insert_ai, 
        c.raw_art, 
        c.sticker_jpeg, 
        c.sticker_pdf,
        json_agg(
            json_build_object(
                'category_id',
                cat.id,
                'category_name',
                cat.name
            )
        ) categories_array
        FROM cards c
        LEFT JOIN cards_categories cc ON c.id = cc.card_id
        LEFT JOIN categories cat ON cc.category_id = cat.id
    GROUP BY c.id
    ORDER BY c.id;
    `;
    pool.query(queryText)
        .then((result) => {
            const theCards = formatCards(result.rows)
            res.send(theCards)
        })
        .catch(err => {
            console.log('ERROR: Get all cards', err);
            res.sendStatus(500)
        })
});

router.get('/byCategory', (req, res) => {
    const queryText = `
    SELECT
        c.id,
        c.name,
        c.description, 
        c.vendor_style, 
        c.upc, 
        c.sku, 
        c.barcode, 
        c.front_img, 
        c.front_tiff, 
        c.inner_img, 
        c.insert_img, 
        c.insert_ai, 
        c.raw_art, 
        c.sticker_jpeg, 
        c.sticker_pdf,
        json_agg(
            json_build_object(
                'category_id',
                cat.id,
                'category_name',
                cat.name
            )
        ) categories_array
        FROM cards c
        LEFT JOIN cards_categories cc ON c.id = cc.card_id
        LEFT JOIN categories cat ON cc.category_id = cat.id
    GROUP BY c.id
    ORDER BY c.id;
    `;
    pool.query(queryText)
        .then(result => {
            let theCards = formatCards(result.rows)
            console.log('the cards from first query', theCards);
            const sqlText = `
            SELECT * FROM "categories";
            `;
            // SECOND QUERY ADDS categories FOR THAT NEW card
            pool.query(sqlText)
                .then(result => {
                    const theCategories = result.rows
                    const cardsByCategory = formatCardsByCategory(theCards, theCategories)
                    //Now that both are done, send back success!
                    res.send(cardsByCategory);
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

router.post('/', (req, res) => {
    const queryText = `
    INSERT INTO "cards" 
    ("name", "vendor_style", "description", "upc", "sku", "barcode", "front_img", "front_tiff", "inner_img", "insert_img", "insert_ai", "raw_art", "sticker_id")
    VALUES 
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING "id";
    `;
    const queryValues = [
        req.body.name,
        req.body.vendor_style,
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
        req.body.sticker_jpeg,
        req.body.sticker_pdf
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

router.put('/:id', (req, res) => {
    const queryText = `
      UPDATE "cards"
        SET 
          "name"=$1, 
          "vendor_style"=$2, 
          "description"=$3,
          "upc"=$4,
          "sku"=$5,
          "barcode"=$6,
          "front_img"=$7,
          "front_tiff"=$8,
          "inner_img"=$9,
          "insert_img"=$10,
          "insert_ai"=$11,
          "raw_art"=$12,
          "sticker_jpeg"=$13,
          "sticker_pdf"=$14
        WHERE
          id=$15;
    `;
    console.log('req.body:', req.body);
    const queryValues = [
        req.body.card.name,
        req.body.card.vendor_style,
        req.body.card.description,
        req.body.card.upc,
        req.body.card.sku,
        req.body.card.barcode,
        req.body.card.front_img,
        req.body.card.front_tiff,
        req.body.card.inner_img,
        req.body.card.insert_img,
        req.body.card.insert_ai,
        req.body.card.raw_art,
        req.body.card.sticker_jpeg,
        req.body.card.sticker_pdf,
        req.params.id
    ];
    pool.query(queryText, queryValues)
        .then(result => {
            const queryDeleteText = `
      DELETE FROM cards_categories
        WHERE cards_id=${req.params.id};
    `;
            // second QUERY removes categories FOR THAT card
            pool.query(queryDeleteText)
                .then(result => {
                    const categoriesArray = req.body.categoriesArrayForQuery
                    const editCardsCategoriesQuery = editCardsCategoriesQuery(categoriesArray, req.params.id);
                    // Third QUERY ADDS categories FOR THAT card
                    pool.query(editCardsCategoriesQuery)
                        .then(result => {
                            res.sendStatus(201);
                        }).catch(err => {
                            // catch for third query
                            console.log(err);
                            res.sendStatus(500)
                        })
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

router.get('/:id', (req, res) => {
    const queryText = `
    SELECT * FROM "cards";
    `

    pool.query(queryText)
        .then(result => {
            res.send(result.rows);
        })
        .catch(error => {
            console.log("Error in GET /api/cards/:id:", error);
            res.sendStatus(500);
        })
})

/**  
 * this function takes in an array from the database 
 * it's goal is to bundle card records together with an array of categories
 * since a single card could have multiple categories
 * */
function formatCards(all) {
    let cardsArray = [];
    for (let i = 0; i < all.length; i++) {
        cardsArray.push({
            card_id: all[i].id,
            name: all[i].name,
            vendor_style: all[i].vendor_style,
            upc: all[i].upc,
            sku: all[i].sku,
            barcode: all[i].barcode,
            front_img: { raw: all[i].front_img },
            front_tiff: all[i].front_tiff,
            inner_img: { raw: all[i].inner_img },
            insert_img: { raw: all[i].insert_img },
            insert_ai: all[i].insert_ai,
            raw_art: all[i].raw_art,
            sticker_jpeg: { raw: all[i].sticker_jpeg },
            sticker_pdf: all[i].sticker_pdf,
            categories_array: all[i].categories_array
        })
        // After getting all cards in cardsArray, we must format the urls for displaying
        for (let i = 0; i < cardsArray.length; i++) {
            //front_img
            cardsArray[i].front_img.display = `https://drive.google.com/thumbnail?id=${extractID(cardsArray[i].front_img.raw)}`;
            //inner_img
            cardsArray[i].inner_img.display = `https://drive.google.com/thumbnail?id=${extractID(cardsArray[i].inner_img.raw)}`;
            //insert_img
            cardsArray[i].insert_img.display = `https://drive.google.com/thumbnail?id=${extractID(cardsArray[i].insert_img.raw)}`;
            //sticker_jpeg
            cardsArray[i].sticker_jpeg.display = `https://drive.google.com/thumbnail?id=${extractID(cardsArray[i].sticker_jpeg.raw)}`;
        }
    }
    return cardsArray
}

/**  
 * this function takes in an array of formatted cards and an array of categories 
 * it's goal is to bundle categories with an array of cards within each category
 * since a single category could have multiple cards
 * */
function formatCardsByCategory(incomingCardsArray, incomingCategoriesArray) {
    // create cardsArray for each category object
    let categoriesArray = [];
    for (let i = 0; i < incomingCategoriesArray.length; i++) {
        categoriesArray.push({
            category_id: incomingCategoriesArray[i].id,
            category_name: incomingCategoriesArray[i].name,
            cardsArray: []
        })
    }
    // now for the fun part
    for (let i = 0; i < categoriesArray.length; i++) {
        for (let j = 0; j < incomingCardsArray.length; j++) {
            for (let k = 0; k < incomingCardsArray[j].categories_array.length; k++) {
                if (incomingCardsArray[j].categories_array[k].category_id === categoriesArray[i].category_id) {
                    categoriesArray[i].cardsArray.push(incomingCardsArray[j])
                }
            }
        }
    }
    return categoriesArray
}


/**
 * this function takes in a file's raw google drive url, and extracts the file ID
 * returns a string representing the id
 */
function extractID(rawURL) {
    return rawURL.substring(32, rawURL.length - 17);
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

/**  
 * this function takes in an array of categories 
 * it's goal is to create a query to insert multiple rows in the cards_categories table
 * since a single card could have multiple categories
 * */
function editCardsCategoriesQuery(categoriesArray, card_id) {
    let cardsCategoriesQuery = `
    INSERT INTO "cards_categories"
    ("card_id", "category_id")
    VALUES
    `
    for (let i = 0; i < categoriesArray.length; i++) {
        // adds the appropriate ids
        if (i < categoriesArray.length - 1) {
            cardsCategoriesQuery += `
        (${card_id}, ${categoriesArray[i].id}),
      `
            // adds the appropriate ids and a semi colon
        } else if (i === categoriesArray.length - 1) {
            cardsCategoriesQuery += `
        (${card_id}, ${categoriesArray[i].id});
        `
        }
    }
    return cardsCategoriesQuery;
}


module.exports = router;