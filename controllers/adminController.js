const Admin = require('../model/adminModel');  
const bcrypt = require('bcrypt');

exports.getLoginPage = (req, res) => {
    res.render('admin/login'); 
};

exports.postLogin = async (req, res) => {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });

    if (!admin) {
        return res.render('admin/login', { error: 'Admin not found' });
    }

    const match = await bcrypt.compare(password, admin.password);
    if (!match) {
        return res.render('admin/login', { error: 'Incorrect password' });
    }

    req.session.admin = admin;
    res.redirect('/admin/dashboard');
};

exports.logout = (req, res) => {
    req.session.destroy(() => {
        res.redirect('/admin/login');
    });
};
