// server.js

var deployment = true;

// Express import
var express = require('express');
var app = express();

// import sequalize, database management
var Sequelize = require('sequelize');

// Parser import
var bodyParser = require('body-parser');

// Debug Morgan import
var morgan = require('morgan');

// Import path for the program
var path = require("path");

// Import the checksum, to verify our tokens (extra security)
var checksum = require('checksum');

// Import basic authentication
var basicAuth = require('basic-auth');

// Import crypto
var crypto = require('crypto');

// cookie parser
var cookieParser = require('cookie-parser');

var config = require('./config');

// cookie timelimit
var cookies_time_limit = 60 * 1000 * 1000;

// set app configurations
app.set('superSecret', config.secret);
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(morgan('dev'));

var port = ((deployment) ? (port = process.env.PORT || 80) : (port = process.env.PORT || 8092));

var match = process.env.DATABASE_URL.match(/postgres:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/)

var sequalize 	= 	new Sequelize(match[5], match[1], match[2], {
						dialect:  'postgres',
						protocol: 'postgres',
						port:     match[4],
						host:     match[3],
						logging: false,
						omitNull: true,
						dialectOptions: {
						    ssl: true
						}
					});

function basicAuth(req, res, next) {

	function unauthorized(res) {
		res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
		return res.send(401);
	};

	var user = basicAuth(req);

	if (!user || !user.name || !user.pass) {
		return unauthorized(res);
	};

	if (user.name === config.basic_username && user.pass === config.basic_password ) {
		return next();
	} else {
		return unauthorized(res);
	};
}

/*

	Keep track of done DB's

	user: 				done 	[Abhishek]
	coordinates:  		done 	[Abhishek]
	location:
	session:
	fulfilled_request:
	taco_request:
	taco:
	drone:

*/

var user_db;
var coordinates_db;
var location_db;
var session_db;
var fulfilled_request_db;
var taco_request_db;
var taco_db;
var drone_db;

function define_user(){
	
	return 	sequalize.define('User',	{		
				user_id: 	{
								type: Sequelize.INTEGER,
								primaryKey: true,
								autoIncrement: true
							},
								
				facebook_id: Sequelize.STRING,

				first_name: Sequelize.STRING,
				last_name: Sequelize.STRING,

				email: Sequelize.STRING

			},	{
				freezeTableName: true
			});

}

function define_coordinates(location){
	
	var Coordinates_defined =	sequalize.define('Coordinates',	{
									coordinate_id:  {
														type: Sequelize.INTEGER,
														primaryKey: true,
														autoIncrement: true
													},

									lat_coordinates: Sequelize.FLOAT(17, 20),
									long_coordinates: Sequelize.FLOAT(17, 20),

								});

	Coordinates_defined.belongsTo(location, {foreignKey: 'location_id'});

	return Coordinates_defined;
}



function define_location(){
	return 	sequalize.define('Location',	{		
				location_id: 	{
								type: Sequelize.INTEGER,
								primaryKey: true,
								autoIncrement: true
							},
								
				

				location_name: Sequelize.STRING,
				

			},	{
				freezeTableName: true
			});
}


function define_session(user, drone){
	var Session_defined =	sequalize.define('Location',	{		
								session_id: 	{
												type: Sequelize.INTEGER,
												primaryKey: true,
												autoIncrement: true
											},
												
								token: Sequelize.INTEGER

								},	{
								freezeTableName: true
							});

	Session_defined.belongsTo(user, {foreignKey: 'user_id'});
	Session_defined.belongsTo(drone, {foreignKey: 'drone_id'});

	return Session_defined;
}

function define_fulfilled_request(taco_request, drone){
	var Fulfilled_request_defined =	sequalize.define('Location',	{		
								fulfilled_request_id: 	{
												type: Sequelize.INTEGER,
												primaryKey: true,
												autoIncrement: true
											},
												
								status: Sequelize.ENUM("fulfilled", "active")

								},	{
								freezeTableName: true
							});

	Fulfilled_request_defined.belongsTo(taco_request, {foreignKey: 'taco_request_id'});
	Fulfilled_request_defined.belongsTo(drone, {foreignKey: 'drone_id'});

	return Fulfilled_request_defined;
}


function define_drone(location){
  var drone_defined = sequalize.define('Drone', {
                  drone_id: {
                          type: Sequelize.INTEGER,
                          primaryKey: true,
                          autoIncrement: true
                  },
                  password: Sequelize.STRING,
                });

  drone_defined.belongsTo(location, {foreignKey: 'location_id'});

  return drone_defined;

}

function define_taco(location){
  var taco_defined = sequalize.define('Drone', {
                  taco_id: {
                          type: Sequelize.INTEGER,
                          primaryKey: true,
                          autoIncrement: true
                  },
                  taco_type: Sequelize.ENUM('Beef', 'Veggie', 'Chicken'),
                  number: Sequelize.INTEGER,
                  created: Sequelize.DATE,

  });

  taco_defined.belongsTo(location, {foreignKey: 'location_id'});

  return taco_defined;

}

function define_taco_request(User) {
  var taco_request_defined = sequalize.define('Taco_request', {
                  taco_request_id: {
                            type: Sequelize.INTEGER,
                            primaryKey: true,
                            autoIncrement: true
                  },
                  longitude: Sequelize.FLOAT(20,17),
                  latitude: Sequelize.FLOAT(20,17),
                  created: Sequelize.DATE,
                  taco_type: Sequelize.ENUM('Beef', 'Veggie', 'Chicken'),
  });

  taco_request_defined.belongsTo(User, {foreignKey: 'user_id'});

  return taco_request_defined;

}

user_db = define_user();
user_db.sync().then(function(user){
	location_db = define_location()
	location_db.sync().then(function(location){
		drone_db = define_drone(location_db);
		drone_db.sync().then(function(drone){
			taco_db = define_taco(location_db);
			taco_db.sync().then(function(taco){
				taco_request_db = define_taco_request(user_db);
				taco_request_db.sync().then(function(taco_request){
					coordinates_db = define_coordinates(location_db);
					coordinates_db.sync().then(function(coordinates){
						fulfilled_request_db = define_fulfilled_request(taco_request_db, drone_db);
						fulfilled_request_db.sync().then(function(fulfilled_request){
							session_db = define_session(user_db, drone_db);
							session_db.sync().then(function(session){
								console.log("done defining dbs")
							});
						});
					});
				});
			});
		});
	});
});

app.get("/", function(req, res) {
	res.send("works")
});

app.post("/user/login", function(req, res) {
	res.send("works")
});

app.listen(port);
console.log('Magic happens at http://http://tacodrone-api.herokuapp.com:' + port);