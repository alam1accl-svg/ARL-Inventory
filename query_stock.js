const sql = require('C:\\Users\\Bashir Alam\\AppData\\Local\\npm-cache\\_npx\\ffdd41263fd07c20\\node_modules\\mssql');

const config = {
  server: '203.202.241.211',
  port: 1433,
  user: 'mcp_user',
  password: 'iAOS@35o997',
  options: {
    encrypt: false,
    trustServerCertificate: false
  }
};

async function listTables(dbName) {
  const cfg = { ...config, database: dbName };
  try {
    await sql.connect(cfg);
    const result = await sql.query`
      SELECT TABLE_SCHEMA, TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_SCHEMA, TABLE_NAME
    `;
    console.log(`\n========== ${dbName} - ALL TABLES ==========`);
    result.recordset.forEach(r => console.log(`${r.TABLE_SCHEMA}.${r.TABLE_NAME}`));
    await sql.close();
  } catch (err) {
    console.error(`Error connecting to ${dbName}:`, err.message);
  }
}

async function main() {
  await listTables('DWH');
  await listTables('DataMart');
}

main().catch(e => console.error(e));
