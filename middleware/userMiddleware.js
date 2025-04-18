import userModel from "../models/userModel.js"

const checkSession = async (req, res, next) => {
    
    try {
        if (!req.session.user) {
            return res.redirect('/login?message=Please+login+to+continue&alertType=info');
        }

        const user = await userModel.findById(req.session.user);
        
        if (!user) {
            req.session.destroy();
            return res.redirect('/login?message=Account+not+found&alertType=error');
        }

        if (user.isBlocked) {            
            req.session.destroy();
            return res.redirect('/login?message=Your+account+has+been+blocked&alertType=error');
        }

        res.locals.user = user;
        next();

    } catch (error) {
        console.error('Session Check Error:', error);
        return res.redirect('/login?message=Session+error+occurred&alertType=error');
    }
}

const isLogin = async (req, res, next) => {
    console.log('this is logging session', req.session)
    try {
        if (req.session.userId) {
            return res.redirect('/home');
        }
        res.locals.user = null;
        next();
    } catch (error) {
        console.error('Login Check Error:', error);
        res.locals.user = null;
        next();
    }
}


export default { 
        isLogin, 
    checkSession
}