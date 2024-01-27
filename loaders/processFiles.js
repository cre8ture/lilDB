
// import { WebPDFLoader } from "langchain/document_loaders/web/pdf";
import {extractTextFromPDF} from "./pdfLoader.js"
// import pdfjsWorker from "pdfjs-dist/build/pdf.worker.entry";
// pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;
// import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
// import { CharacterTextSplitter } from "langchain/text_splitter";
// const mammoth = require('mammoth');
// import * as mammoth from 'mammoth';
import * as PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import {CustomTextSplitter} from './characterSplitter.js'

const splitter = new CustomTextSplitter(256, 56);
// const textSplitter = new RecursiveCharacterTextSplitter();
// const textSplitter = new CharacterTextSplitter(256, 56);


async function readDocxFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (event) => {
      const zip = new PizZip(event.target.result);
      const doc = new Docxtemplater(zip);
      const text = doc.getFullText();
      resolve(text);
    };

    reader.onerror = (event) => {
      reject(new Error("Error reading DOCX file"));
    };

    reader.readAsArrayBuffer(file);
  });
}

function isFile(file) {
  return file instanceof File;
}

export async function processDocument(file) {
  let content;
  let fileExtension = ''
  // if(typeof file === 'string'){
  if(isFile(file)){
   fileExtension = file.name.split(".").pop().toLowerCase();
  }

  if (fileExtension === "pdf") {
  //  content = await processPDF(file);
  content = await extractTextFromPDF(file);
    // Convert the PDF file into a Blob
    // const blob = new Blob([file], { type: "application/pdf" });

    // // Load the PDF using WebPDFLoader
    // const loader = new WebPDFLoader(blob);
    // const docs = await loader.load();

    // // Extract the text content from the PDF
    // content = docs.map((doc) => doc.page_content).join(" ");
  } else if (fileExtension === "txt") {
    // Read the text file content using FileReader API
    content = await readTextFile(file);
  } 
  else if (fileExtension === "docx") {
    content = await readDocxFile(file);
  }else {
    console.log("file is a string!")
    // Assume it's a string
    content = file;
  }

  // Choose the appropriate text splitter based on the file extension
  // let textSplitter;
  // if (!fileExtension === "pdf") {
  //   // textSplitter = new RecursiveCharacterTextSplitter();
  //   textSplitter = new CharacterTextSplitter("\n\n", 1000, 200);

  // }
  //  else {
  //   textSplitter = new CharacterTextSplitter("\n\n", 1000, 200);
  // }

  // Split the text into chunks using the text splitter
  const chunks = splitter.split(content);

  return chunks;
}


function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      resolve(event.target.result);
    };

    reader.onerror = (error) => {
      reject(error);
    };

    reader.readAsText(file);
  });
}


// const fileInput = document.getElementById("fileInput"); // Assuming you have an input element for file selection
// const file = fileInput.files[0]; // Assuming you want to process the first selected file

// processDocument(file)
//   .then((chunks) => {
//     console.log(chunks);
//     // Do something with the chunks
//   })
//   .catch((error) => {
//     console.error("Error processing document:", error);
//   });
