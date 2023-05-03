const mongoose = require('mongoose');
require("dotenv").config();

const {MONGO_DB_URL} = process.env 

const connectToDB = async () => {
    return mongoose.connect(MONGO_DB_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
    .then( () => {
        console.log("Connected to DataBase Successfully.");
    })
    .catch( (err) => {
        console.log("Error in database connection \n", err);
    });
}


module.exports = {connectToDB}


