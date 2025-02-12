import { Console } from 'console';
import { config } from 'dotenv';


config()


export const getloginPage = (req, res)=> {
   
    res.render('admin/login',{message:null})
}




//.........afterlogining in way to dashboard....................//

export const login =async(req,res)=>{
    try {
        const {email ,password} = req.body;
        console.log(req.body)
        if (!email||!password) {
                     return res.render('admin/login', { error: 'field are required for login' });
        }

        if (email === process.env.ADMIN_EMAIL&& password === process.env.ADMIN_PASSWORD) {
            console.log(process.env.ADMIN_EMAIL,process.env.ADMIN_PASSWORD)
            // console.log(req.session)
            req.session.admin=true;
            // console.log(req.session)
             res.json({message:"heloo",success:true})
     return  res.render('admin/dashboard',{message:null}); 
        }else{
            return res.render('admin/login', { error: 'Incorrect credentials' });
        }


    } catch (error) {
        
        // return res.render('admin/login', { error: 'Error occured during login' });
}
}



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




// export const postLogin = async (req, res) => {
//     const { email, password } = req.body;
//     const admin = await Admin.findOne({ email });

//     if (!admin) {
//         return res.render('admin/login', { error: 'Admin not found' });
//     }

//     const match = await bcrypt.compare(password, admin.password);
//     if (!match) {
//         return res.render('admin/login', { error: 'Incorrect password' });
//     }

//     req.session.admin = admin;
//     res.redirect('/admin/dashboard');
// };

// 
