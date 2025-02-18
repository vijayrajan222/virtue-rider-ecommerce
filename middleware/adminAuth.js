export const isAdminAuth = (req, res, next) => {
    if (req.session.admin) {  // Changed from isAdminAuth to admin
        next();
    } else {
        res.redirect('/admin/login');
    }
}; 