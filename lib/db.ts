import sql from 'mssql';

const sqlConfig = {
  user: process.env.DB_USER || 'sa', 
  password: process.env.DB_PASSWORD || '123456', 
  database: process.env.DB_NAME || 'ProductHub_TEST',
  server: process.env.DB_SERVER || 'localhost',
  options: {
    instanceName: process.env.DB_INSTANCE || 'SQLEXPRESS',
    encrypt: false, 
    trustServerCertificate: true 
  }
};

// שומר את החיבור פתוח כדי שהשרת לא יקפא בכל בקשה
let poolPromise: Promise<sql.ConnectionPool> | null = null;

export async function getConnection() {
  if (!poolPromise) {
    poolPromise = sql.connect(sqlConfig)
      .then(pool => {
        console.log('--- DB Pool Connected Successfully ---');
        return pool;
      })
      .catch(err => {
        console.error('Database connection failed: ', err);
        poolPromise = null;
        throw err;
      });
  }
  return poolPromise;
}