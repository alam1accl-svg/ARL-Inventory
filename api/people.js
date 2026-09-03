import { SNAPSHOT } from '../lib/data.mjs';

const FALLBACK = SNAPSHOT.peopleDesk || {
  activeEmployees: 17845, permanent: 8088, probationary: 4717, contractual: 2619,
  casual: 1250, interns: 244, male: 16302, female: 1495,
  clearancePending: 1442, clearanceSalary: 45589501
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  try {
    const sql = (await import('mssql')).default;
    const pool = await sql.connect({
      user: process.env.MSSQL_USER || 'mcp_user',
      password: process.env.MSSQL_PASSWORD,
      server: process.env.MSSQL_SERVER || '203.202.241.211',
      port: parseInt(process.env.MSSQL_PORT || '1433', 10),
      database: process.env.MSSQL_DATABASE || 'DWH',
      options: { encrypt: false, trustServerCertificate: true },
      requestTimeout: 12000, connectionTimeout: 6000
    });
    const r = await pool.request().query(`
      SELECT
        (SELECT COUNT(*) FROM saas.empEmployeeBasicInfoArc WHERE isActive=1) AS activeEmployees,
        (SELECT COUNT(*) FROM saas.empEmployeeBasicInfoArc WHERE isActive=1 AND strEmploymentType='Permanent') AS permanent,
        (SELECT COUNT(*) FROM saas.empEmployeeBasicInfoArc WHERE isActive=1 AND strEmploymentType='Probationary') AS probationary,
        (SELECT COUNT(*) FROM saas.empEmployeeBasicInfoArc WHERE isActive=1 AND strEmploymentType='Contractual') AS contractual,
        (SELECT COUNT(*) FROM saas.empEmployeeBasicInfoArc WHERE isActive=1 AND strEmploymentType='Casual') AS casual,
        (SELECT COUNT(*) FROM saas.empEmployeeBasicInfoArc WHERE isActive=1 AND strEmploymentType='Intern') AS interns,
        (SELECT COUNT(*) FROM saas.empEmployeeBasicInfoArc WHERE isActive=1 AND strGender='Male') AS male,
        (SELECT COUNT(*) FROM saas.empEmployeeBasicInfoArc WHERE isActive=1 AND strGender='Female') AS female,
        (SELECT COUNT(*) FROM saas.EmpClearanceApplicationArc WHERE isActive=1 AND (strStatus IS NULL OR strStatus='')) AS clearancePending,
        (SELECT ISNULL(SUM(numLastMonthSalary),0) FROM saas.EmpClearanceApplicationArc WHERE isActive=1 AND (strStatus IS NULL OR strStatus='')) AS clearanceSalary
    `);
    await pool.close();
    res.status(200).json({ ...r.recordset[0], source: 'live' });
  } catch (e) {
    console.error('people fetch error:', e.message);
    res.status(200).json({ ...FALLBACK, source: 'snapshot' });
  }
}
