const mysql = require('mysql');

const dbConfig = {
	host: "35.201.251.157",
	user: "root",
	password: "NeoHsu2023",
	database: "member",
};

const conn = null;//mysql.createConnection(dbConfig);

// conn.connect(function(err) {
// 	if (err) {
// 		console.log("\n\t *** Cannot establish a connection with the database. ***");
// 		this.conn = reconnect(conn);
// 	} else {
// 		console.log("MySQL connected!");
// 	}
// });

function reconnect(connection, query, callback) {
	console.log("\n New connection tentative...");
	//- Destroy the current connection variable
	if (connection)
		connection.destroy();

	//- Create a new one
	connection = mysql.createConnection(dbConfig);
	//- Try to reconnect
	connection.connect(function(err){
		if (err) {
			//- Try to connect every 2 seconds.
			setTimeout(reconnect, 2000);
		}
		else {
			console.log("\n\t *** New connection established with the database. ***")
			if (query != null && callback != null) {
				connection.query(query, function (err, results, fields) {
					if (err) {
						reconnect(connection, query, callback);
					}
					else
						callback(err, results);
				});
			}

			return connection;
		}
	});
}

exports.connect = conn;

exports.reconnectDB = function(query, callback) {
	this.conn = reconnect(conn, query, callback);
}