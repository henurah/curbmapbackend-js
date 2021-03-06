'use strict';
const express = require('express');
const session = require('express-session');
const path = require('path');
const logger = require('morgan');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const fs = require('fs');
const cors = require('cors');
require('dotenv').config({path: '../curbmap.env'});
const postgres = require('./model/postgresModels');
const RedisStore = require('connect-redis')(session);
const redis = require('redis').createClient(50005, '127.0.0.1');
const compression = require('compression');
const winston = require('winston');
const bcrypt = require('bcrypt');

redis.auth(process.env.REDIS_PASSWORD);

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// CORS setup
var whitelist = [
    'http://localhost:8080',
    'https://curbmap.com',
    'https://curbmap.com:443',
    'http://curbmap.com:8080',
    '*'
];
var corsOptions = {
    origin: function (origin, callback) {
        winston.log('info', "origin: ", origin);
        if (whitelist.indexOf('*') !== -1 || whitelist.indexOf(origin) !== -1) {
            callback(null, true)
        } else {
            callback(new Error('Not allowed by CORS'))
        }
    }
};

app.options('*', cors(corsOptions)); // include before other routes
app.use(cors(corsOptions));
app.use(logger('dev'));
app.use(cookieParser());
app.use(compression({filter: shouldCompress}));

function shouldCompress (req, res) {
    if (req.headers['x-no-compression']) {
        // don't compress responses with this request header
        return false
    }

    // fallback to standard filter function
    return compression.filter(req, res)
}

// Session stuff
app.use(session({
    store: new RedisStore({
        host: '127.0.0.1',
        port: 50005,
        prefix: 'curbmap:sessions:',
        client: redis,
        ttl: 100
    }),
    resave: false,
    saveUninitialized: false,
    secret: process.env.REDIS_SECRET
}));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function (user, cb) {
    cb(null, user.username)
});

passport.deserializeUser(function (username, cb) {
    findUser(username, cb)
});

function findUser(username, cb) {
    postgres.User.findOne({where: {username: username}}).then(
        function (foundUser) {
            if (foundUser !== null) {
                return cb(null, foundUser);
            } else {
                return cb(null, false)
            }
        }
    );
}
passport.authMiddleware = require('./auth/authMiddleware');

// We will add other Strategies, such as FB strategy
passport.use(new LocalStrategy(
    function (username, password, done) {
        findUser(username, function (nullvalue, userObject) {
            if (userObject !== false) {
                bcrypt.compare(password, userObject.password_hash, function (err, res) {
                    if (err) {
                        return done(err)
                    }
                    else if (res === true) {
                        return done(null, userObject)
                    } else {
                        return done(null, false)
                    }
                })
            } else {
                return done(null, false)
            }
        })
    }
));
require('./routes/index').init(app, redis);

// routes can also get the body
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static(path.join(__dirname, 'public')));

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
