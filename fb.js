const facebookStrategy = require('passport-facebook').Strategy;

exports.setting = function(app, api, passport) {
    app.use(passport.initialize());
    app.use(passport.session());

    // Use the FacebookStrategy within Passport.
    passport.use(new facebookStrategy({
            clientID: '746629653449291',
            clientSecret: 'bce3fcde4b5314987a9e34a61452a09e',
            callbackURL: 'https://aha.nicemarket.com.tw/auth/facebook/callback'
        },
        api.authCallback
    ));

    passport.serializeUser(function (user, cb) {
        cb(null, user);
    });

    passport.deserializeUser(function (obj, cb) {
        cb(null, obj);
    });

    app.get('/fb-login-success', api.fbLoginSuccess);
    app.get('/auth/facebook', passport.authenticate('facebook',{scope:'public_profile'}));

    app.get('/auth/facebook/callback',
        passport.authenticate('facebook', { successRedirect : '/fb-login-success', failureRedirect: '/login' }),
        function(req, res) {
            res.redirect('/');
        }
    );
}