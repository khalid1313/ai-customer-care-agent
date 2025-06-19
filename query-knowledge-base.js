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
    console.log('Connected to the SQLite database.');
});

// Query to get knowledge base data
const businessId = process.argv[2] || 'cmbsfx1qt0001tvvj7hoemk12';

const query = `
    SELECT 
        bc.businessId,
        bc.knowledgeBase,
        bc.isIndexed,
        bc.updatedAt,
        b.name as businessName,
        b.email as businessEmail
    FROM BusinessContext bc
    LEFT JOIN Business b ON bc.businessId = b.id
    WHERE bc.businessId = ?
`;

console.log(`\nQuerying knowledge base for business ID: ${businessId}`);
console.log('----------------------------------------\n');

db.get(query, [businessId], (err, row) => {
    if (err) {
        console.error('Error executing query:', err.message);
        return;
    }
    
    if (!row) {
        console.log('No data found for the specified business ID.');
        db.close();
        return;
    }
    
    console.log('Business Information:');
    console.log(`- Name: ${row.businessName || 'N/A'}`);
    console.log(`- Email: ${row.businessEmail || 'N/A'}`);
    console.log(`- Indexed: ${row.isIndexed ? 'Yes' : 'No'}`);
    console.log(`- Last Updated: ${row.updatedAt}\n`);
    
    if (row.knowledgeBase) {
        try {
            const knowledgeBase = JSON.parse(row.knowledgeBase);
            
            console.log('Knowledge Base Content:');
            console.log('----------------------------------------');
            console.log(JSON.stringify(knowledgeBase, null, 2));
            
            // Count items
            console.log('\n----------------------------------------');
            console.log('Summary:');
            console.log(`- Categories: ${knowledgeBase.categories?.length || 0}`);
            console.log(`- FAQs: ${knowledgeBase.faqs?.length || 0}`);
            console.log(`- Policies: ${Object.keys(knowledgeBase.policies || {}).length}`);
            
        } catch (parseError) {
            console.error('Error parsing knowledge base JSON:', parseError.message);
            console.log('Raw knowledge base data:', row.knowledgeBase);
        }
    } else {
        console.log('No knowledge base data stored.');
    }
    
    db.close();
});

// Handle database closing
db.on('close', () => {
    console.log('\nDatabase connection closed.');
});