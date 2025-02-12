import { Console } from 'console';
import { config } from 'dotenv';


config()


export const getloginPage = (req, res)=> {
   
    res.render('admin/login',{message:null})
}




//.........afterlogining in way to dashboard....................//

// export const login =async(req,res)=>{
//     try {
//         const {email ,password} = req.body;
//         // console.log(req.body)
//         if (!email||!password) {
//                      return res.render('admin/login', { error: 'field are required for login' });
//         }

//         if (email === process.env.ADMIN_EMAIL&& password === process.env.ADMIN_PASSWORD) {
//             console.log(process.env.ADMIN_EMAIL,process.env.ADMIN_PASSWORD)
//             req.session.admin=true;
//             return res.redirect('/admin/dashboard', { success: true, redirectUrl: "/admin/dashboard" });
//             // res.json({message:"heloo",success:true})
//             // res.redirect('/admin/dashboard'); 
//             // return res.redirect('/admin/dashboard');

//         }else{
//             return res.json({ success: false, error: 'Incorrect credentials' });        }


//     } catch (error) {
        
//         console.error("Login Error:", error);
//         return res.json({ success: false, error: "An error occurred during login" });
// }

// }
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

            // ✅ Correctly return JSON response
            return res.json({ success: true, redirectUrl: "/admin/dashboard" });
        } else {
            console.log("Invalid credentials:", email, password);
            return res.status(401).json({ success: false, message: "Incorrect credentials" });
        }

    } catch (error) {
        console.error("Login Error:", error);

        // ✅ Return a proper JSON error response
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};


export const getdashboard = async (req,res)=>{
    if(req.session.admin){
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



    export const getproductPage =(req,res)=>{
        // if(req.session.admin){
            
                res.render("admin/product")}
            // }else{
            //     res.render("error.ejs")
        //     }
        


        export const getcategoryPage =(req,res)=>{
            res.render("admin/category")
        }



