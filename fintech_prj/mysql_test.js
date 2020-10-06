var mysql = require("mysql");
var connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "1q2w3e4r", //본인 비밀번호
  database: "fintech090921",
});

connection.connect();
connection.query("SELECT * FROM user", function (error, results, fields) {
  if (error) throw error;
  console.log(results);
});

connection.end();
