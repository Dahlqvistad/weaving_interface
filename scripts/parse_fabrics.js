// Script to parse Visma-artiklar-01072024.xlsx and output fabrics.json with only 'metervara' articles
// Usage: node parse_fabrics.js <path-to-xlsx> <output-json>

const xlsx = require('xlsx');
const fs = require('fs');

const inputFile = process.argv[2] || './data/Visma-artiklar-01072024.xlsx';
const outputFile = process.argv[3] || './data/parsed_metervara.json';

function normalize(str) {
    return (str || '').toLowerCase();
}

function parseFabrics(sheet) {
    // Find columns: Article number, Name, Color, Width, etc
    // Adjust these keys to match your actual spreadsheet headers
    const rows = xlsx.utils.sheet_to_json(sheet);
    return rows
        .filter((row) =>
            normalize(
                row['Name'] || row['Artikelbenämning'] || row['Benämning']
            ).includes('metervara')
        )
        .map((row) => ({
            article_number:
                row['Article number'] || row['Artikelnummer'] || row['Art.nr'],
            name: row['Name'] || row['Artikelbenämning'] || row['Benämning'],
            color: row['Color'] || row['Färg'],
            width: row['Width'] || row['Bredd'],
            // Add more fields if needed
        }))
        .filter((fabric) => fabric.article_number && fabric.name);
}

function main() {
    const workbook = xlsx.readFile(inputFile);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const fabrics = parseFabrics(sheet);
    fs.writeFileSync(outputFile, JSON.stringify(fabrics, null, 2));
    if (fabrics.length === 0) {
        console.warn(
            '⚠️ No fabrics found with "metervara" in name. Check your spreadsheet columns and data.'
        );
    } else {
        console.log(
            `✅ Parsed ${fabrics.length} fabrics with 'metervara' in name.`
        );
    }
    console.log(`Output written to ${outputFile}`);
}

main();
