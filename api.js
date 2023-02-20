db = require('./db');
const url = require('url');
const format = require('util').format;
const nodeMailer = require('nodemailer');
const randomString = require("randomstring");
const cryptoJS = require("crypto-js");

const QUERY_SELECT_ONE = 'SELECT * FROM account where %s = "%s";';
const QUERY_FIELD_EXIST = 'SELECT EXISTS (SELECT * FROM account where %s = "%s") as RESULT;';
const QUERY_INSERT_ACCOUNT_EMAIL = 'INSERT INTO account (email, password, createTime, sessionTime, loggedInCount, validated) VALUES (\'%s\', \'%s\', NOW(), \'%s\', 1, 0)';
const QUERY_INSERT_ACCOUNT_FB = 'INSERT INTO account (fbId, name, createTime, sessionTime, loggedInCount) VALUES (\'%s\', \'%s\', NOW(), \'%s\', 1)';
const QUERY_INSERT_ACCOUNT_GOOGLE = 'INSERT INTO account (googleId, name, createTime, sessionTime, loggedInCount) VALUES (\'%s\', \'%s\', NOW(), \'%s\', 1)';
const QUERY_UPDATE_LOGIN_TIME = 'UPDATE account SET sessionTime = \'%s\', loggedInCount = %d WHERE %s = "%s";';
const QUERY_UPDATE_VALIDATED = 'UPDATE account SET validated = 1 WHERE %s = "%s";';
const QUERY_UPDATE_PASSWORD = 'UPDATE account SET password = "%s" WHERE %s = "%s";';
const QUERY_UPDATE_NAME = 'UPDATE account SET name = "%s" WHERE %s = "%s";';

const WebPage = {
	INDEX: 'index',
	LOGIN: 'login',
	SIGNUP: 'signup',
	EMAIL_CONFIRM: 'email-confirm',
	CHANGE_PASSWORD: 'change-password',
	FORGOT_PASSWORD: 'forgot-password',
	RESET_PASSWORD: 'reset-password',
	MY_ACCOUNT: 'my-account',
}

const AccountField = {
	EMAIL: 'email',
	PASSWORD: 'password',
	FBID: 'fbId',
	GOOGLEID: 'googleId',
}

const hostName = 'localhost:15000';
const validateCode = '20230216';
const validateSubtitle = 'AHA exam from Neo';
const validateEmail = '<p>For validate your email, please click the link below:</p><p>Validate code %s</p><p>http://%s/email-confirm?email=%s&code=%s</p><br><b>Neo Hsu</b>';

// create reusable transporter object using the default SMTP transport
const mailTransport = nodeMailer.createTransport('SMTP', {
	service: 'Gmail',
	auth: {
		user: 'neoxuisme@gmail.com',
		pass: 'agtplfvhfnulfmei'
	}
});

// setup e-mail data with unicode symbols
const mailOptions = {
	from: '"Neo Hsu" <NiceMarketGames-gm-no-reply@nicemarket.com.tw>', // sender address
	to: '', // list of receivers
	cc: 'neoxuisme@gmail.com',
	subject: '', // Subject line
	text: '', // plaintext body
	html: '' // html body
};

function dbQuery(query, callback) {
	try
	{
		console.log(query);
		db.connect.query(query, function (err, results, fields) {
			if (err)
				callback(err);
			else
				callback(err, results);
		});
	} catch (e) {
		console.log('dbQuery exception: ' + e);
		callback(e);
	}
}

function checkError(err, res, page) {
	if (!err)
		return true;
	else {
		if (res) {
			const clientObj = {title: page, RecMessage: err};

			if (res.req && res.req.session)
				clientObj.account = res.req.session.account;

			res.render(page, clientObj);
		}

		return false;
	}
}

function padTo2Digits(num) {
	return num.toString().padStart(2, '0');
}

function formatDate(date) {
	return (
		[
			date.getUTCFullYear(),
			padTo2Digits(date.getUTCMonth() + 1),
			padTo2Digits(date.getUTCDate()),
		].join('-') +
		' ' +
		[
			padTo2Digits(date.getUTCHours()),
			padTo2Digits(date.getUTCMinutes()),
			padTo2Digits(date.getUTCSeconds()),
		].join(':')
	);
}

function responseClient(res, page, msg) {
    if (!page)
        page = WebPage.INDEX;

    if (msg == null)
        msg = '';

	let clientObj = {title: page, RecMessage: msg};
    if (res.req && res.req.session) {
		clientObj.account = res.req.session.account;
	}

    res.render(page, clientObj);
}

function relogin(msg, res) {
	responseClient(res, WebPage.LOGIN, msg);
}

function validatePassword(password) {
	if (password && password.length >= 8) {
		let hasDigital = false;
		let hasLower = false;
		let hasUpper = false;
		let hasSpecial = false;

		for (let i = 0; i < password.length; i++) {
			let code = password[i].charCodeAt();
			if (code >= 48 && code <= 57)
				hasDigital = true;
			else
			if (code >= 97 && code <= 122)
				hasLower = true;
			else
			if (code >= 65 && code <= 90)
				hasUpper = true;
			else
				hasSpecial = true;
		}

		return hasDigital && hasLower && hasUpper && hasSpecial;
	} else
		return false;
}

function parseURL(url, data) {
	let ps = url.split('?');
	if (ps.length == 2) {
		let foos = ps[1].split('&');
		if (foos && foos.length == 2) {
			let email = foos[0].split('=');
			let code = foos[1].split('=');
			if (email != null && email.length == 2 && code != null && code.length == 2 && email[0] == 'email' && code[0] == 'code') {
				data.email = email[1];
				data.code = code[1];
				return true;
			}
		}
	}

	return false;
}

function getSessionTime(req) {
	let sessionTime = new Date();
	sessionTime.setDate(req.session.cookie.expires.getDate() - 7);
	return formatDate(sessionTime);
}

function updateLoginTime(req, res, field, id, sessionTime, loggedInCount) {
	if (!loggedInCount)
		loggedInCount = 1;

	loggedInCount++;
	let query = format(QUERY_UPDATE_LOGIN_TIME, sessionTime, loggedInCount, field, id);
	dbQuery(query, function (err, result) {
		if (checkError(err, res, WebPage.LOGIN)) {
			req.session.account.loggedInCount = loggedInCount;
		} else
			responseClient(res, WebPage.LOGIN, err);
	});
}

function updateName(res, req, name, fieldName, fieldValue) {
	let query = format(QUERY_UPDATE_NAME, name, fieldName, fieldValue);
	dbQuery(query, function (err, result) {
		if (checkError(err, res, WebPage.MY_ACCOUNT)) {
			req.session.account.name = req.body.name;
			responseClient(res, WebPage.MY_ACCOUNT, 'Update profile success.');
		} else
			responseClient(res, WebPage.MY_ACCOUNT, err);
	});
}

exports.index = function(req, res) {
	if (req.session.account)
    	responseClient(res, WebPage.MY_ACCOUNT);
	else
		responseClient(res, WebPage.SIGNUP);
}

exports.login = function(req, res) {
	if (req.body.email && req.body.password) {
		let query = format(QUERY_SELECT_ONE, AccountField.EMAIL, req.body.email);

		dbQuery(query, function(err, result) {
			if (checkError(err, res, WebPage.LOGIN) && result && result.length > 0) {
				let account = result[0];

				if (account.password == req.body.password) {
                    if (account.validated) {
                        req.session.account = account;
                        responseClient(res, WebPage.MY_ACCOUNT);

						let sessionTime = getSessionTime(req);
						updateLoginTime(req, res, AccountField.EMAIL, req.body.email, sessionTime, account.loggedInCount);
                    } else { //Resend validation email.
						let clientObj = {
							title: WebPage.LOGIN,
							validated: req.body.email,
							RecMessage: 'Please validate Email.'
						};
						if (res.req && res.req.session)
							clientObj.account = res.req.session.account;

						res.render(WebPage.LOGIN, clientObj);
					}
				} else
					relogin('Password error.', res);
			}
		});
	} else
		relogin('Please confirm Email and password you entered.', res);
}

exports.signUp = function(req, res) {
	if (req.body.email && req.body.password) {
		if (req.body.password == req.body.confirm) {
			if (validatePassword(req.body.password)) {
				let query = format(QUERY_FIELD_EXIST, AccountField.EMAIL, req.body.email);

				dbQuery(query, function (err, result) {
					if (checkError(err, res, WebPage.SIGNUP)) {
						if (result != null && result.length > 0 && !result[0].RESULT) {
							let query2 = format(
								QUERY_INSERT_ACCOUNT_EMAIL,
								req.body.email,
								req.body.password,
								getSessionTime(req));

							dbQuery(query2, function (err, result2) {
								if (checkError(err, res, WebPage.LOGIN)) {
                                    mailOptions.to = req.body.email;
                                    mailOptions.subject = validateSubtitle;
                                    mailOptions.html = format(validateEmail, validateCode, hostName, req.body.email, validateCode);

                                    // send mail with defined transport object
                                    mailTransport.sendMail(mailOptions, function (err, info) {
                                        if (checkError(err, res, WebPage.SIGNUP))
                                            responseClient(res, WebPage.EMAIL_CONFIRM, req.body.email);
                                    });
								}
							});
						} else
                            responseClient(res, WebPage.SIGNUP, 'This email has been used.');
					}
				});
			} else
                responseClient(res, WebPage.SIGNUP, 'Please validate password.');
		} else
            responseClient(res, WebPage.SIGNUP, 'Please confirm password.');
	} else
        responseClient(res, WebPage.SIGNUP);
}

exports.emailConfirm = function(req, res) {
    try {
		let email = req.body.email;
		let code = req.body.code;

		if (!email || !code) {
			let urlData = {};

			if (parseURL(req.url, urlData)) {
				email = urlData.email;
				code = urlData.code;
			}
		}

		if (email && code == validateCode) {
			let query = format(QUERY_SELECT_ONE, AccountField.EMAIL, email);

			dbQuery(query, function(err, result) {
				if (checkError(err, res, WebPage.EMAIL_CONFIRM) && result != null) {
					let query = format(QUERY_UPDATE_VALIDATED, AccountField.EMAIL, email);

					dbQuery(query, function(err, result) {
						if (checkError(err, res, WebPage.EMAIL_CONFIRM)) {
							let account = {email: email};
							req.session.account = account;
							responseClient(res, WebPage.MY_ACCOUNT);
						}
					});
				}
			});
		} else
            responseClient(res, WebPage.EMAIL_CONFIRM, 'Please check email and verification code.');
    } catch (e) {
        console.log('EMailConfirm exception: ' + e);
		responseClient(res, WebPage.EMAIL_CONFIRM, 'EMailConfirm exception: ' + e);
    }
}

exports.resendValidation = function(req, res) {
	if (req.body.email) {
		let query = format(QUERY_FIELD_EXIST, AccountField.EMAIL, req.body.email);

		dbQuery(query, function (err, result) {
			if (checkError(err, res, WebPage.LOGIN)) {
				if (result != null && result.length > 0 && result[0].RESULT) {
					mailOptions.to = req.body.email;
					mailOptions.subject = validateSubtitle;
					mailOptions.html = format(validateEmail, validateCode, hostName, req.body.email, validateCode);

					// send mail with defined transport object
					mailTransport.sendMail(mailOptions, function (err, info) {
						if (checkError(err, res, WebPage.LOGIN))
							responseClient(res, WebPage.EMAIL_CONFIRM, req.body.email);
					});
				}
			}
		});
	} else
		responseClient(res, WebPage.LOGIN, 'Please check email.');
}

exports.resetPassword = function(req, res) {
	if (req.body.oldPassword && req.body.newPassword && req.body.confirm) {
		if (req.session.account.password == req.body.oldPassword) {
			if (req.body.newPassword != req.body.oldPassword) {
				if (req.body.newPassword == req.body.confirm) {
					if (validatePassword(req.body.newPassword)) {
						if (req.session.account) {
							if (req.session.account.email) {
								let query = format(QUERY_FIELD_EXIST, AccountField.EMAIL, req.session.account.email);

								dbQuery(query, function (err, result) {
									if (checkError(err, res, WebPage.MY_ACCOUNT)) {
										if (result != null && result.length > 0 && result[0].RESULT) {
											let query2 = format(QUERY_UPDATE_PASSWORD, req.body.newPassword, AccountField.EMAIL, req.session.account.email);
											dbQuery(query2, function (err, result2) {
												if (checkError(err, res, WebPage.MY_ACCOUNT)) {
													responseClient(res, WebPage.MY_ACCOUNT, 'Reset password success.');
													req.session.account.password = req.body.newPassword;
												} else
													responseClient(res, WebPage.MY_ACCOUNT, err);
											});
										} else
											responseClient(res, WebPage.MY_ACCOUNT, 'Please login first.');
									}
								});
							} else
								responseClient(res, WebPage.MY_ACCOUNT, 'Please login by Email.');
						} else
							responseClient(res, WebPage.MY_ACCOUNT, 'Please login first.');
					} else
						responseClient(res, WebPage.MY_ACCOUNT, 'Please validate password.');
				} else
					responseClient(res, WebPage.MY_ACCOUNT, 'Please confirm new password.');
			} else
				responseClient(res, WebPage.MY_ACCOUNT, 'New password can not the same old password.');
		} else
			responseClient(res, WebPage.MY_ACCOUNT, 'Please check old password.');
	}
}

exports.updateProfile = function(req, res) {
	if (req.body.name) {
		if (req.session.account) {
			if (req.session.account.email) { //login by email
				let query = format(QUERY_FIELD_EXIST, AccountField.EMAIL, req.session.account.email);

				dbQuery(query, function (err, result) {
					if (checkError(err, res, WebPage.MY_ACCOUNT)) {
						if (result != null && result.length > 0 && result[0].RESULT) {
							updateName(res, req, req.body.name, AccountField.EMAIL, req.session.account.email);
						} else
							responseClient(res, WebPage.MY_ACCOUNT, 'Please login first.');
					}
				});
			} else
			if (req.session.account.fbId) {
				let query = format(QUERY_FIELD_EXIST, AccountField.FBID, req.session.account.fbId);

				dbQuery(query, function (err, result) {
					if (checkError(err, res, WebPage.MY_ACCOUNT)) {
						if (result != null && result.length > 0 && result[0].RESULT) {
							updateName(res, req, req.body.name, AccountField.FBID, req.session.account.fbId);
						} else
							responseClient(res, WebPage.MY_ACCOUNT, 'Please login first.');
					}
				});
			} else
				responseClient(res, WebPage.MY_ACCOUNT, 'Please login by Email.');
		} else
			responseClient(res, WebPage.MY_ACCOUNT, 'Please login first.');
	} else
		responseClient(res, WebPage.MY_ACCOUNT, 'Please check name.');
}

exports.logout = function(req, res) {
	if (req.session.account) {
		delete req.session.account;
		req.session.destroy(function(err) {
			console.log('session destroy' + err);
		})
	}


	relogin('Logout', res);
}

exports.authCallback = function(accessToken, refreshToken, profile, done) {
	process.nextTick(function () {
		return done(null, profile);
	});
}

exports.fbLoginSuccess = function(req, res) {
	if (req.user) {
		console.log(req.user);
		let query = format(QUERY_SELECT_ONE, AccountField.FBID, req.user.id);

		dbQuery(query, function(err, result) {
			if (checkError(err, res, WebPage.LOGIN)) {
				if (result && result.length > 0) {
					res.req.session.account = result[0];
					responseClient(res, WebPage.MY_ACCOUNT, 'FB login success.');

					let sessionTime = getSessionTime(req);
					updateLoginTime(req, res, AccountField.FBID, req.user.id, sessionTime, result[0].loggedInCount);
				} else { //insert a new account
					let query2 = format(
						QUERY_INSERT_ACCOUNT_FB,
						req.user.id,
						req.user.displayName,
						getSessionTime(req));

					dbQuery(query2, function (err, result2) {
						if (checkError(err, res, WebPage.LOGIN)) {
							res.req.session.account = {fbId: req.user.id, name: req.user.displayName};
							responseClient(res, WebPage.MY_ACCOUNT, 'FB login success.');
						}
					});
				}
			}
		});
	}
}

exports.googleLoginSuccess = function(req, res) {
	if (req.user) {
		console.log(req.user);
		let query = format(QUERY_SELECT_ONE, AccountField.GOOGLEID, req.user.id);

		dbQuery(query, function(err, result) {
			if (checkError(err, res, WebPage.LOGIN)) {
				if (result && result.length > 0) {
					res.req.session.account = result[0];
					responseClient(res, WebPage.MY_ACCOUNT, 'Google login success.');

					let sessionTime = getSessionTime(req);
					updateLoginTime(req, res, AccountField.GOOGLEID, req.user.id, sessionTime, result[0].loggedInCount);
				} else { //insert a new account
					let query2 = format(
						QUERY_INSERT_ACCOUNT_GOOGLE,
						req.user.id,
						req.user.displayName,
						getSessionTime(req));

					dbQuery(query2, function (err, result2) {
						if (checkError(err, res, WebPage.LOGIN)) {
							res.req.session.account = {googleId: req.user.id, name: req.user.displayName};
							responseClient(res, WebPage.MY_ACCOUNT, 'Google login success.');
						}
					});
				}
			}
		});
	}
}

exports.dashboard = function(req, res) {

}



