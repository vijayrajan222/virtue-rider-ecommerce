export const checkSession = (req, res, next) => {
    if (req.session.admin) {  // Changed from isAdminAuth to admin
        next();
    } else {
        res.redirect('/admin/login');
    }
}; 


const isLogin  = (req, res, next)=>{
 
    if(req.session.isAdmin){
        res.redirect('/admin/dashboard')
    }else{
        next()
    }
}


export default { isLogin, checkSession }