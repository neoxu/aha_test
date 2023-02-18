const GoogleStrategy = require( 'passport-google-oauth20' ).Strategy;

exports.setting = function(app, api, passport) {
    // Use the GoogleStrategy within Passport.
    passport.use(new GoogleStrategy({
            clientID: '854327390035-i2dmqnm4fbub8ubc4qnnv08md0e710m7.apps.googleusercontent.com',
            clientSecret: 'D5aG-noTqRKIwe5gHhUzm4I_',
            callbackURL: 'http://localhost:15000/auth/google/callback'
        },
        api.authCallback
    ));

    app.get('/google-login-success', api.googleLoginSuccess);
    app.get('/auth/google', passport.authenticate('google',{scope:'profile'}));

    app.get('/auth/google/callback',
        passport.authenticate('google', { successRedirect : '/google-login-success', failureRedirect: '/login' }),
        function(req, res) {
            res.redirect('/');
        }
    );
}