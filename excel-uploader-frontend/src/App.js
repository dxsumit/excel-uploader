
import './App.css';
import {useForm} from "react-hook-form"
import axios from "axios";
import {useState} from "react"
import { RotatingLines } from 'react-loader-spinner'


const App = () => {

  const [fileName, setFileName] = useState("No file selected");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(false);
  const [status, setStatus] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm();


  const baseURL = "http://localhost:4000"

  const onSubmit = async (data) => {
    setLoading(true)
    const formData = new FormData();
    formData.append("myFile", data.excelFile[0])
    try {
      const response = await axios.post(`${baseURL}/api/upload/excel`, formData);
      setStatus(response.data.status)
      setLoading(false);
      setResult(true);
    
    }
    catch(err){
        console.log(err);
    }

    reset();
  };
  
  const handleFileInputChange = (event) => {
    const input = event.target;
    if (input.files && input.files[0]) {
      setFileName(input.files[0].name);
    }
  }

    if(loading){
      return(
        <div className="flex flex-col items-center justify-center my-2 rounded-lg py-3 pl-4 mt-16">
          <RotatingLines
            strokeColor="grey"
            strokeWidth="5"
            animationDuration="0.75"
            width="72"
            visible={true}
          />
        </div>
      )
    }
    else if(result){
      return (
        (status === "success") ?
            (<div className="flex flex-col items-center justify-center my-2 py-3 pl-4">
              <h3 className="text-base md:text-2xl font-bold mt-8 text-emerald-500"> 
                Success
              </h3>
              <p className="text-xs md:text-sm font-semibold text-[#242331]"> File has been saved in database successfully. </p>
            </div>)
          :
            (<div className="flex flex-col items-center justify-center my-2 py-3 pl-4">
              <h3 className="text-base md:text-2xl font-bold mt-8 text-red-500"> 
                Failed
              </h3>
              <p className="text-xs md:text-sm font-semibold text-[#242331]"> Something went wrong while saving. </p>
            </div>)
      )
    }
    
    else {
      return (
        <>
        <form onSubmit={handleSubmit(onSubmit)} >

          <label htmlFor='excelFile' className='cursor-pointer border-dashed rounded-lg'>

            <div className="flex flex-col items-center justify-center my-2 rounded-lg py-3 pl-4">

              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg aria-hidden="true" className="w-12 h-12 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                  
                  <p className="text-sm text-gray-500 dark:text-gray-400">Upload file .xls or .xlsx</p>
              </div>
            
              <input className='opacity-0' id="excelFile" name="excelFile" type="file" accept='.xls,.xlsx' {...register("excelFile", {
                  required: "Excel file is required."
                })}

                onChange={handleFileInputChange}
              />

              <label className='py-2 font-semibold text-blue-500 underline'>
                {fileName}
              </label>

              <div className="cut"></div>
            
              {errors.excelFile && (
                <p className="errorMsg py-2" style={{color:'#f22952', fontSize:'13px'}} >{errors.excelFile.message}</p>
              )}
              
              <button className="text-white bg-emerald-500 border-0 rounded-full text-sm px-4 py-2 ml-3 md:mt-0 md:py-3 md:px-14">
                Submit
              </button>

            </div>
          </label>

        </form>
        </>
      )
  }
}

export default App;
