const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Path to the SQLite database
const dbPath = path.join(__dirname, 'prisma', 'dev.db');

// Create database connection
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
});

// Query to get raw knowledge base data
const businessId = process.argv[2] || 'cmbsfx1qt0001tvvj7hoemk12';

const query = `
    SELECT 
        businessId,
        knowledgeBase,
        businessInfo,
        isIndexed,
        createdAt,
        updatedAt
    FROM BusinessContext
    WHERE businessId = ?
`;

console.log(`\nChecking raw knowledge base data for business ID: ${businessId}`);
console.log('----------------------------------------\n');

db.get(query, [businessId], (err, row) => {
    if (err) {
        console.error('Error executing query:', err.message);
        db.close();
        return;
    }
    
    if (!row) {
        console.log('No business context found for this ID.');
        
        // List all available business contexts
        console.log('\nListing all available business contexts:');
        db.all('SELECT businessId, createdAt FROM BusinessContext', (err, rows) => {
            if (err) {
                console.error('Error listing contexts:', err.message);
            } else {
                rows.forEach((r, i) => {
                    console.log(`${i + 1}. Business ID: ${r.businessId} (Created: ${r.createdAt})`);
                });
            }
            db.close();
        });
        return;
    }
    
    console.log('Business Context Found:');
    console.log(`- Business ID: ${row.businessId}`);
    console.log(`- Indexed: ${row.isIndexed ? 'Yes' : 'No'}`);
    console.log(`- Created: ${row.createdAt}`);
    console.log(`- Updated: ${row.updatedAt}`);
    console.log('');
    
    if (row.businessInfo) {
        console.log('Business Info (Raw):');
        console.log(row.businessInfo);
        console.log('');
    }
    
    if (row.knowledgeBase) {
        console.log('Knowledge Base Status: FOUND');
        console.log('Raw Data Type:', typeof row.knowledgeBase);
        console.log('Raw Data Length:', row.knowledgeBase.length);
        console.log('\nRaw Knowledge Base Data:');
        console.log('----------------------------------------');
        console.log(row.knowledgeBase);
        console.log('----------------------------------------\n');
        
        try {
            // Try to parse if it's already a string
            const parsed = typeof row.knowledgeBase === 'string' 
                ? JSON.parse(row.knowledgeBase) 
                : row.knowledgeBase;
                
            console.log('Parsed Knowledge Base:');
            console.log(JSON.stringify(parsed, null, 2));
        } catch (e) {
            console.log('Could not parse knowledge base as JSON:', e.message);
        }
    } else {
        console.log('Knowledge Base Status: NOT FOUND (null or empty)');
    }
    
    db.close();
});