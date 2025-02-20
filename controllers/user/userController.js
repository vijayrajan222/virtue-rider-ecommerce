import Product from '../../models/productModel.js';

const getAboutPage = (req, res) =>{
    res.render('user/about')
}

const getsignUpPage = (req, res)=> {
    res.render('user/signup')
}

const getloginPage = (req, res)=> {
    res.render('user/login')
}

const gethomePage = async (req, res) => {
    try {
        // Fetch latest products
        const products = await Product.find({ isHidden: false })
            .sort({ createdAt: -1 })  // Sort by newest first
            .limit(10)  // Limit to 10 products
            .populate('categoryId');

        res.render('user/home', {
            products,
            user: req.session.user
        });
    } catch (error) {
        console.error('Error fetching home page:', error);
        res.status(500).send('Server Error');
    }
}

const getforgotPasswordPage = (req,res)=>{
    res.render('user/forgotPassword')
}

export {
    getAboutPage,
    getsignUpPage,
    getloginPage,
    gethomePage,
    getforgotPasswordPage
};