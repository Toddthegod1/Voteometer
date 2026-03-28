const pdf = require('pdf-parse');

const fs = require('fs');
const path = require('path');

const pdfPath = path.join(__dirname, 'Voteometer original document.pdf');

fs.readFile(pdfPath, (err, dataBuffer) => {
  if (err) {
    console.error('Error reading the PDF file:', err);
    return;
  }

  pdf(dataBuffer)
    .then((data) => {
      console.log('PDF Text Content:\n', data.text);
    })
    .catch((error) => {
      console.error('Error parsing the PDF file:', error);
    });
});