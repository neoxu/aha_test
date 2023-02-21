let http = require('http');
let express = require('express');
let path = require('path');

let favicon = require('serve-favicon');
let logger = require('morgan');
let methodOverride = require('method-override');
let session = require('express-session');
let bodyParser = require('body-parser');
let errorHandler = require('errorhandler');

let api = require('./api');
let fb = require('./fb');
let google = require('./google');
let passport = require('passport');
let partials = require('express-partials');

let app = express();

// all environments
app.set('port', 15000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(favicon(path.join(__dirname, '/public/images/logo.png')));
app.use(logger('dev'));
app.use(methodOverride());
app.use(session({
    resave: true,
    saveUninitialized: true,
    secret: 'nicemarket2023',
    cookie: { maxAge: 7 * 24 * 60 * 60000 }
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(partials());

if (app.get('env') === 'development') {
    app.use(errorHandler())
}

// const path = require('path'),
//     express = require('express'),
//     partials = require('express-partials'),
//     api = require('./api'),
//     app = express(),
//     passport = require('passport'),
//     fb = require('./fb'),
//     google = require('./google'),
//     port = 15000;
//
// // all environments
// app.set('port', port);
// app.set('views', path.join(__dirname, 'views'));
// app.set('view engine', 'ejs');
// app.use(express.bodyParser());
// app.use(partials());
// app.use(express.cookieParser());
// app.use(express.session({secret: '123456789abcdefg', cookie: { maxAge: 7 * 24 * 60 * 60000 }}));
// app.use(express.favicon());
// app.use(express.json());
// app.use(express.urlencoded());
// app.use(express.methodOverride());
// app.use(express.static(path.join(__dirname, 'public')));
//
// //development only
// if ('development' === app.get('env')) {
//     app.use(express.logger('dev'));
//     app.use(express.errorHandler());
// }

//fb setting
fb.setting(app, api, passport);

//google setting
google.setting(app, api, passport);

//web
app.get('/', api.index);
app.get('/index', api.index);
app.get('/login', api.login);
app.post('/login', api.login);
app.get('/signup', api.signUp);
app.post('/signup', api.signUp);
app.get('/email-confirm', api.emailConfirm);
app.post('/email-confirm', api.emailConfirm);
app.get('/resend-validation', api.resendValidation);
app.post('/resend-validation', api.resendValidation);
app.get('/reset-password', api.resetPassword);
app.post('/reset-password', api.resetPassword);
app.get('/update-profile', api.updateProfile);
app.post('/update-profile', api.updateProfile);
app.get('/logout', api.logout);
app.get('/dashboard', api.dashboard);

app.listen(app.get('port'), () => {
    console.log('Express server listening on port ' + app.get('port'))
})