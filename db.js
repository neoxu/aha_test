const mysql = require('mysql');

const dbConfig = {
	host: "35.201.251.157",
	user: "root",
	password: "NeoHsu2023",
	database: "member",
};

const conn = mysql.createConnection(dbConfig);

conn.connect(function(err) {
	if (err) {
		console.log("\n\t *** Cannot establish a connection with the database. ***");
		this.conn = reconnect(conn);
	} else {
		console.log("MySQL connected!");
	}
});

//- Error listener
conn.on('error', function(err) {
	//- The server close the connection.
	if (err.code === "PROTOCOL_CONNECTION_LOST") {
		console.log("/!\\ Cannot establish a connection with the database. /!\\ ("+err.code+")");
		this.conn = reconnect(conn);
	}
	else //- Connection in closing
	if (err.code === "PROTOCOL_ENQUEUE_AFTER_QUIT") {
		console.log("/!\\ Cannot establish a connection with the database. /!\\ ("+err.code+")");
		this.conn = reconnect(conn);
	}
	else //- Fatal error : connection variable must be recreated
	if(err.code === "PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR") {
		console.log("/!\\ Cannot establish a connection with the database. /!\\ ("+err.code+")");
		this.conn = reconnect(conn);
	}
	else //- Error because a connection is already being established
	if(err.code === "PROTOCOL_ENQUEUE_HANDSHAKE_TWICE") {
		console.log("/!\\ Cannot establish a connection with the database. /!\\ ("+err.code+")");
	}
	else { //- Anything else
		console.log("/!\\ Cannot establish a connection with the database. /!\\ ("+err.code+")");
		this.conn = reconnect(conn);
	}
});

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
				conn.query(query, function (err, results, fields) {
					if (err) {
						reconnect(conn, query, callback);
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
	reconnect(conn, query, callback);
}