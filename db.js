const mysql = require('mysql');
const conn = mysql.createConnection({
	host: "35.201.251.157",
	user: "root",
	password: "NeoHsu2023",
	database: "member",
});

conn.connect(function(err) {
	if (err)
		console.log("MySQL fail " + err);
	else
		console.log("MySQL connected!");
});

exports.connect = conn;