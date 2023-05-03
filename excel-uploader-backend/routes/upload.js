const router = require("express").Router();
const mongoose = require("mongoose");
const async = require("async");
require("dotenv").config();

const multer  = require("multer")
const xlsx = require("xlsx");
const upload = multer({ dest: './public/data/uploads/'})


router.get('/', (req,res) => {
    res.status(200).json({status: "success", msg: "This uploader API"}); 
});



const dropDuplicates = async (myModel, columns) => {
    // find the duplicates...
    const duplicates = await myModel.aggregate(
        [
        {
            $group: { 
                _id: columns,           // fields on which duplication has been checked...
                duplicate: { $push: "$_id" },    // list of duplicates
                count: { $sum: 1 }                  // count++ 
            },
        },
        { $match: { count: { $gt: 1 }} },
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

    try{
        const file = req.file;
        if (!file) {
            return res.status(200).json({status: "failed", msg: "Could not found file.."}); 
        }

        // reading excel file..
        const workbook = xlsx.readFile(file.path);
        const sheetNameList = workbook.SheetNames;
        let randomCount; // for naming the model

         // unique emails..
         let emailList = {}
         let columnsForDups = [];

         // create schema for that sheet..
         let schemaObject = {}
         let emailExist = false
         let emailFormat

         let columnNames, rowData;

        for(let sheetName of sheetNameList){
            columnNames = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 })[0];
            rowData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

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

            randomCount = Math.floor(Math.random()*1000);
            // use the unique identifier as the name of the table
            const Sheet = mongoose.model(`${sheetName}_${randomCount}`, excelSchema);

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
                async.eachSeries(rowData, (row, callback) => {
                    // if email already exists then skip...
                    if(!emailList[row[emailFormat]]){
                        emailList[row[emailFormat]] = 1;
                        // adding data to the collection
                        const newData = new Sheet(row)
                        newData.save();
                    }
                    callback();
                }, (error) => {
                    if (error)
                        return res.status(200).json({status: "failed", msg: err}); ;
                });

            } else{
                columnsForDups = [...columnNames];
                columnsForDups = columnsForDups.map((each) => {
                    each = each.replace(/\.$/, ""); 
                    return `$${each}`   
                })

                async.eachSeries(rowData, (row, callback) => {
                    // adding data to the collection
                    const newData = new Sheet(row)
                    newData.save();
                    callback();
                    
                }, (error) => {
                    if (error)
                        return res.status(200).json({status: "failed", msg: err}); ;
                });
            }

            ///////////////////////////////////////////////////////////////
            dropDuplicates(Sheet, columnsForDups);
        }

        res.status(200).json({status: "success", msg: "Successfully added items to the database."}); 
    }   
    catch(err){
        res.status(200).json({status: "failed", msg: err}); 
    }
});


// // test duplicates 
// router.get('/test', async (req,res) => {

//     try{
//         const currentSchema = { 
//             Email: { type: String, trim: true, unique: true },
//             Year: { type: String, trim: true },
//             Phone: { type: String, trim: true }
//         }
//         const excelSchema = new mongoose.Schema(currentSchema);

//         const Sheet = mongoose.model("contact", excelSchema);

//         // find the duplicates...
//         const duplicates = await Sheet.aggregate(
//             [
//               {
//                 $group: { 
//                     _id: ["$Year", "$Phone", "$some"],           // fields on which duplication has been checked...
//                     duplicate: { $push: "$_id" },    // list of duplicates
//                     count: { $sum: 1 }                  // count++ 
//                 },
//               },
//               { $match: { count: { $gt: 1 }} },
//             ],
//             { allowDiskUse: true }
//         );

//         // dropping the duplicates...
//         for(let each of duplicates){
//             each.duplicate.shift();
//             await Sheet.deleteMany({_id: {$in: each.duplicate} })
//         }

//         res.status(200).json({status: "success", msg: duplicates}); 
//     }   
//     catch(err){
//         res.status(200).json({status: "failed", msg: err}); 
//     }
// });


module.exports = router;

