import { config } from 'dotenv';

config();

// Admin Authentication Controllers
export const getAdminLogin = async (req, res) => {
    try {
        if (req.session.admin) {
            res.redirect('/admin/dashboard');
        } else {
            res.render('admin/login', {
                path: req.path,
                title: 'Admin Login'
            });
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Server Error');
    }
};

export const postAdminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
            req.session.admin = true;
            res.status(200).json({ success: true, redirectUrl: '/admin/products' });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

export const logout = async (req, res) => {
    try {
        req.session.destroy();
        res.redirect('/admin/login');
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Server Error');
    }
};

