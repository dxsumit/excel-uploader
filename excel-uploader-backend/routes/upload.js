const router = require("express").Router();
const mongoose = require("mongoose");
const async = require("async");
require("dotenv").config();
const multer  = require("multer")
const xlsx = require("xlsx");
const upload = multer({ dest: './public/data/uploads/'})


// base URL 
router.get('/', (req,res) => {
    res.status(200).json({status: "success", msg: "This uploader API"}); 
});



// 'myFile' is the name from the frontend form...
router.post('/excel', upload.single('myFile'), async (req,res) => {

        const file = req.file;
        if (!file) {
            return res.status(200).json({status: "failed", msg: "Could not found file.."}); 
        }

        // reading excel file..
        const workbook = xlsx.readFile(file.path);
        const sheetNameList = workbook.SheetNames;


        // There could be multiple sheet within excel file so loop over all of them.. 
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


            /*
                To check duplicates in database before inserting, Unique Compound Indexes has been used.
                Here all column names are considered as one compound index that's why any new data matching
                them will be considered as duplicates..
                This will happen before database insertion.

                If email field exists in excel sheet it will be ignored in compound index because 
                emails are unique which was already made sure by API code. 

            */

            // create unique compound index on schema for duplication dropping..
            let compoundIndexObject = {}
            for(let each of columnNames){
                // skipping the email because we already made sure emails are unique..
                if(each !== emailFormat){
                    compoundIndexObject[each] = 1;
                }
            }

            // creating compound index
            excelSchema.index(compoundIndexObject, { unique: true, dropDups: true });






            let randomCount; // for unique model name..
            randomCount = Math.floor(Math.random()*1000);

            // use the unique identifier as the name of the table
            const Sheet = mongoose.model(`${sheetName}_${randomCount}`, excelSchema);


            // to update the newly created indexes in database... 
            await Sheet.ensureIndexes();  


            // skipping the emails if already exist...
            if(emailExist){

                // synchronous call over items..
                async.eachSeries(rowData, async (row) => {

                    // unique emails..
                    let emailList = {}

                    // if email already exists then skip...
                    if(!emailList[row[emailFormat]]){
                        emailList[row[emailFormat]] = 1;
                        // adding data to the collection
                        try{
                            // converting into object
                            let current_row = {}
                            const values = Object.values(row);
                            columnNames.forEach((key, i) => { current_row[key] = values[i] })

                            // saving data..
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
               
                async.eachSeries(rowData, async (row) => {
                    // adding data to the collection
                    try{
                        // converting into object
                        let current_row = {}
                        const values = Object.values(row);
                        columnNames.forEach((key, i) => { current_row[key] = values[i] })

                        // saving data..
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



        }

        res.status(200).json({status: "success", msg: "Successfully added items to the database."}); 

});

module.exports = router;


