const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

/**
 * Script to parse XLSX files and extract metervara articles
 * Usage: node parse-xlsx-fabrics.js <path-to-xlsx-file>
 */

function parseMetervara(benamning) {
    // More flexible pattern: find pattern, "metervara", width, and color
    // Handle variations like "bredd 150 cm" or "bredd 150" and trailing text
    const regex = /^(.+?)\s+metervara\s+(?:.*?bredd\s+)?(\d+)(?:\s*cm)?(?:.*?),\s*(.+)$/i;
    const match = benamning.match(regex);
    
    if (!match) {
        // Try alternative pattern without "bredd"
        const altRegex = /^(.+?)\s+metervara.*?(\d+)(?:\s*cm)?.*?,\s*(.+)$/i;
        const altMatch = benamning.match(altRegex);
        
        if (!altMatch) {
            return null;
        }
        
        return {
            pattern: altMatch[1].trim(),
            width: parseInt(altMatch[2]),
            color: altMatch[3].trim()
        };
    }
    
    return {
        pattern: match[1].trim(),
        width: parseInt(match[2]),
        color: match[3].trim()
    };
}

function processXlsxFile(filePath) {
    try {
        // Read the workbook
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0]; // Use first sheet
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON with header row
        const data = XLSX.utils.sheet_to_json(worksheet);
        
        if (data.length === 0) {
            console.log('No data found in the spreadsheet');
            return {};
        }
        
        // Check if required columns exist
        const firstRow = data[0];
        const requiredColumns = ['Artikelnummer', 'Benämning', 'I lager'];
        
        for (const col of requiredColumns) {
            if (!(col in firstRow)) {
                console.error(`Required column "${col}" not found. Available columns:`, Object.keys(firstRow));
                return {};
            }
        }
        
        console.log(`Processing ${data.length} rows...`);
        
        const fabrics = {};
        let processedCount = 0;
        let metervararCount = 0;
        let parsedCount = 0;
        
        data.forEach((row, index) => {
            processedCount++;
            
            const artikelnummer = row['Artikelnummer'];
            const benamning = row['Benämning'];
            const iLager = row['I lager'];
            
            // Skip if missing required data
            if (!artikelnummer || !benamning) {
                return;
            }
            
            // Check if this is a metervara
            if (!benamning.toLowerCase().includes('metervara')) {
                return;
            }
            
            metervararCount++;
            
            // Parse the metervara name
            const parsed = parseMetervara(benamning);
            if (!parsed) {
                console.warn(`Could not parse metervara: "${benamning}"`);
                return;
            }
            
            parsedCount++;
            console.log(`Found: ${benamning}`);
            
            const { pattern, width, color } = parsed;
            
            // Create a unique key for this fabric pattern + width combination
            const fabricKey = `${pattern}_${width}`;
            
            // Initialize fabric pattern if it doesn't exist
            if (!fabrics[fabricKey]) {
                fabrics[fabricKey] = {
                    name: `${pattern} metervara bredd ${width}`,
                    width: width,
                    skott_per_meter: 1300, // Default value, adjust as needed
                    colors: {}
                };
            }
            
            // Add color and article number
            const quantity = parseFloat(iLager) || 0;
            fabrics[fabricKey].colors[color] = artikelnummer;
            
            console.log(`  → Pattern: ${pattern}, Width: ${width}, Color: ${color}, Article: ${artikelnummer}, Stock: ${quantity}`);
        });
        
        console.log(`\nProcessing complete:`);
        console.log(`- Total rows processed: ${processedCount}`);
        console.log(`- Metervara articles found: ${metervararCount}`);
        console.log(`- Successfully parsed: ${parsedCount}`);
        console.log(`- Unique fabric patterns: ${Object.keys(fabrics).length}`);
        
        return fabrics;
        
    } catch (error) {
        console.error('Error processing file:', error.message);
        return {};
    }
}

function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Usage: node parse-xlsx-fabrics.js <path-to-xlsx-file>');
        console.log('Example: node parse-xlsx-fabrics.js ./data/Visma-artiklar-01072024.xlsx');
        process.exit(1);
    }
    
    const filePath = args[0];
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        process.exit(1);
    }
    
    console.log(`Processing XLSX file: ${filePath}`);
    
    // Process the file
    const fabrics = processXlsxFile(filePath);
    
    if (Object.keys(fabrics).length === 0) {
        console.log('No fabric data extracted');
        return;
    }
    
    // Generate output file name
    const inputDir = path.dirname(filePath);
    const inputName = path.basename(filePath, path.extname(filePath));
    const outputPath = path.join(inputDir, `${inputName}-fabrics.json`);
    
    // Write to JSON file
    try {
        fs.writeFileSync(outputPath, JSON.stringify(fabrics, null, 4));
        console.log(`\nFabrics data written to: ${outputPath}`);
        
        // Also show preview
        console.log('\nPreview of extracted data (first 3 patterns):');
        const preview = {};
        Object.keys(fabrics).slice(0, 3).forEach(key => {
            preview[key] = fabrics[key];
        });
        console.log(JSON.stringify(preview, null, 2));
        
    } catch (error) {
        console.error('Error writing output file:', error.message);
    }
}

if (require.main === module) {
    main();
}

module.exports = { processXlsxFile, parseMetervara };
