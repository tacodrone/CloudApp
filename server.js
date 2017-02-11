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

app.get("/", function(req, res) {
	res.send("works")
});

app.listen(port);
console.log('Magic happens at http://http://tacodrone-api.herokuapp.com:' + port);