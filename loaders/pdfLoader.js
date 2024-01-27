import * as pdfjsLib from 'pdfjs-dist/webpack.mjs';

export async function extractTextFromPDF(file) {
    try {
        // Convert the PDF file into an ArrayBuffer
        const reader = new FileReader();
        reader.readAsArrayBuffer(file);
        await new Promise((resolve, reject) => {
          reader.onload = resolve;
          reader.onerror = reject;
        });
        const arrayBuffer = reader.result;
    
        console.log("ArrayBuffer is", arrayBuffer);
        // Load the PDF using pdfjsLib.getDocument
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    
        const pdf = await loadingTask.promise;
    
        // Extract the text content from the PDF
        let content = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          content += textContent.items.map(item => item.str).join(' ');
        }
    
        console.log("content is proc", content);
    
        return content;
      } catch (error) {
        console.error("An error occurred while processing the PDF:", error);
      }
    }

// // Example usage:
// const fileInput = document.getElementById('fileInput'); // Assuming you have an input element with id "fileInput"

// fileInput.addEventListener('change', function() {
//   handleFiles(this.files);
// });

// async function handleFiles(files) {
//   for (const file of files) {
//     try {
//       const text = await extractTextFromPDF(file);
//       console.log('Text extracted from PDF:', text);
//       // Do something with the extracted text
//     } catch (error) {
//       // Handle the error
//       console.error('Error extracting text from PDF:', error);
//     }
//   }
// }
