const router = require("express").Router();
const mongoose = require("mongoose");
const async = require("async");
require("dotenv").config();
var uniqueValidator = require('mongoose-unique-validator');

const multer  = require("multer")
const xlsx = require("xlsx");
const upload = multer({ dest: './public/data/uploads/'})


router.get('/', (req,res) => {
    res.status(200).json({status: "success", msg: "This uploader API"}); 
});


const dropDuplicates = async (myModel, columns) => {
    // find the duplicates...
    const duplicates = await myModel.aggregate([
        {
            $group: { 
                _id: columns,           // fields on which duplication has been checked...
                duplicate: { $push: "$_id" },    // list of duplicates
                count: { $sum: 1 }                  // count++ 
            },
        },
        { 
            $match: { count: { $gt: 1 }}
        },
    ],
        { allowDiskUse: true }
    );

    // dropping the duplicates...
    for(let each of duplicates){
        each.duplicate.shift();
        await myModel.deleteMany({_id: {$in: each.duplicate} })
    }
}



// 'myFile' is the name from the frontend form...
router.post('/excel', upload.single('myFile'), async (req,res) => {

        const file = req.file;
        if (!file) {
            return res.status(200).json({status: "failed", msg: "Could not found file.."}); 
        }

        // reading excel file..
        const workbook = xlsx.readFile(file.path);
        const sheetNameList = workbook.SheetNames;
        let randomCount; // for naming the model


        for(let sheetName of sheetNameList){
            let columnNames = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 })[0];
            let rowData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

            // fixing column name, suitable for schema and indexes...
            columnNames = columnNames.map((each) => {
                let newName = each.replaceAll(" ", "_");
                newName = newName.replace(/\.$/, ""); 
                return newName;
            })

            // create schema for that sheet..
            let schemaObject = {}
            let emailFormat = "";
            let emailExist = false;
            for(let each of columnNames){
                if(each.toLowerCase() === "email"){
                    emailExist = true;
                    emailFormat = each;
                    schemaObject[each] = {
                        type: String,
                        trim: true,
                        unique: true,
                    }
                } else {
                    schemaObject[each] = {
                        type: String,
                        trim: true
                    }
                }
            }

            // create schema.
            const excelSchema = new mongoose.Schema(schemaObject);

            // create unique compound index on schema for duplication dropping..
            let compoundIndexObject = {}
            for(let each of columnNames){
                // skipping the email because we already made sure emails are unique..
                if(each !== emailFormat){
                    compoundIndexObject[each] = 1;
                }
            }
            // creating index
            excelSchema.index(compoundIndexObject, { unique: true, dropDups: true });


            randomCount = Math.floor(Math.random()*1000);
            // use the unique identifier as the name of the table
            const Sheet = mongoose.model(`${sheetName}_${randomCount}`, excelSchema);
            await Sheet.ensureIndexes();  // to update the newly created indexes. 

            // unique emails..
            let emailList = {}
            let columnsForDups = [];

            // skipping the emails if already exist...
            if(emailExist){

                columnsForDups = [...columnNames];
                columnsForDups = columnsForDups.map((each) => {
                    if(each !== emailFormat)
                        each = each.replace(/\.$/, ""); 
                        return `$${each}`
                })
                // remove the undefined element..
                columnsForDups = columnsForDups.filter((each) => (each !== undefined) )

                // synchronous call over items..
                async.eachSeries(rowData, async (row) => {
                    // if email already exists then skip...
                    if(!emailList[row[emailFormat]]){
                        emailList[row[emailFormat]] = 1;
                        // adding data to the collection
                        try{
                            // converting into object
                            let current_row = {}
                            const values = Object.values(row);
                            columnNames.forEach((key, i) => { current_row[key] = values[i] })

                            const newData = new Sheet(current_row)
                            await newData.save();
                        }
                        catch(err){
                            console.log(`Found Dupliacte: ${err.message}`);
                        }
                    }
                    
                }, (error) => {
                    if (error)
                        return res.status(200).json({status: "failed while inserting", msg: err}); ;
                });

            } else{
                columnsForDups = [...columnNames];
                columnsForDups = columnsForDups.map((each) => {
                    return `$${each}`   
                })

                async.eachSeries(rowData, async (row) => {
                    // adding data to the collection
                    try{
                        // converting into object
                        let current_row = {}
                        const values = Object.values(row);
                        columnNames.forEach((key, i) => { current_row[key] = values[i] })

                        const newData = new Sheet(current_row)
                        await newData.save();
                    }
                    catch(err){
                        console.log(`Found Dupliacte: ${err.message}`);
                    }
                    
                }, (error) => {
                    if (error)
                        return res.status(200).json({status: "failed while inserting", msg: err}); ;
                });
            }

            ///////////////////////////////////////////////////////////////
            // dropDuplicates(Sheet, columnsForDups);
        }

        res.status(200).json({status: "success", msg: "Successfully added items to the database."}); 

});

module.exports = router;

