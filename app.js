const express = require('express');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const mongoose = require('mongoose');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const csrf = require('csurf');
const path = require('path');

const User = require('./models/user');

const adminRouter = require('./routes/admin');
const shopRouter = require('./routes/shop');
const authRouter = require('./routes/auth');

const errorController = require('./controllers/error');

const app = express();

const store = new MongoDBStore({ uri: process.env.MONGO_URI, collection: 'sessions' });

cloudinary.config({ cloud_name: 'dasgupta002', api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_SECRET });
const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'Shopper',
        allowedFormats: ['jpeg', 'png', 'jpg'],
    }
});

const csrfSecurity = csrf();

app.set('view engine', 'pug');

app.use(express.urlencoded({ extended: false }));
app.use(multer({ storage: storage }).single('image'));

app.use(express.static(path.join(__dirname, 'public')));

app.use(session({ secret: 'session secret key', resave: false, saveUninitialized: false, store: store }));
app.use(csrfSecurity);

app.use((req, res, next) => {
    res.locals.auth = req.session.authState;
    res.locals.csrfToken = req.csrfToken();
    next();
});

app.use((req, res, next) => {
    if (req.session.user) {
        User.findById(req.session.user._id)
            .then((user) => {
                if(!user) {
                    next();
                } else {
                    req.user = user;
                    next();
                }
            })
            .catch((error) => {
                next(new Error(error));
            });
    } else {
        next();
    }
});

app.use('/auth', authRouter);
app.use('/admin', adminRouter);
app.use('/', shopRouter);

app.use(errorController.notFound);
app.use((error, req, res, next) => res.status(500).render('500', { pageTitle: '500 Error!' }));  

const port = process.env.PORT || 80;

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true })
        .then((result) => app.listen(port))
        .catch((error) => console.error(error.message));