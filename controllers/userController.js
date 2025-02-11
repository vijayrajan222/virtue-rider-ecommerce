export const getAboutPage = (req, res) =>{
    res.render('user/about')
}


export const getsignUpPage = (req, res)=> {
    res.render('user/signup')
}


export const getloginPage = (req, res)=> {
    res.render('user/login')
}

export const gethomePage = (req,res)=>{
    res.render('user/home')
}


export const getforgotPasswordPage = (req,res)=>{
    res.render('user/forgotPassword')
}