import { config } from 'dotenv';


config()


export const getloginPage = (req, res) => {

    res.render('admin/login', { message: null })
}


export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log("Login Attempt:", email, password);

        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Fields are required for login" });
        }

        if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
            console.log("Admin login successful:", email);
            req.session.admin = true;

            //  Correctly return JSON response
            return res.json({ success: true, redirectUrl: "/admin/dashboard" });
        } else {
            console.log("Invalid credentials:", email, password);
            return res.status(401).json({ success: false, message: "Incorrect credentials" });
        }

    } catch (error) {
        console.error("Login Error:", error);

        //  Return a proper JSON error response
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};


export const getdashboard = async (req, res) => {
    if (req.session.admin) {
        try {
            res.render("dashboard")
        } catch (error) {
            res.redirect("pageerror")
        }
    }
}

export const getlogoutPage = (req, res) => {
    req.session.destroy(() => {
        res.redirect('/admin/login');

    });
};


export const getproductPage = (req, res) => {
    res.render("admin/product")
}


export const getuserPage = (req, res) => {
    res.render("admin/userList")
}

export const getcategoryPage = (req, res) => {
    res.render("admin/category")
}

export const getorderPage = (req, res) => {
    res.render("admin/order")
}

export const getsalesReport = (req, res) => {
    res.render("admin/sales-report")
}

export const getcouponPage = (req, res) => {
    res.render("admin/coupon")
}

export const getofferPage = (req, res) => {
    res.render("admin/offers")
}

