import sql from 'mssql';

const sqlConfig = {
  user: 'sa', 
  password: '123456', // הכנס כאן את סיסמת ה-SQL שלך
  database: 'ProductHub',
  server: 'localhost',
  options: {
    instanceName: 'SQLEXPRESS',
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