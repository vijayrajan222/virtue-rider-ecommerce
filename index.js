import express, { urlencoded } from 'express';
import dotenv from "dotenv";
import path from 'path';
import { connectDB } from './db/connectDB.js'
import { fileURLToPath } from 'url';
import expressEjsLayouts from 'express-ejs-layouts';
import userRouter from './routes/userRouter.js'
import adminRouter from './routes/adminRouter.js'
import session from "express-session";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename); 

dotenv.config()

const app = express()
app.use(session({
  secret: "helo this is screct",
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false, httpOnly: true }  // Set secure: true in production with HTTPS
}));
const PORT =process.env.PORT || 3000;

app.use(express.json())
app.use(urlencoded({extended:true}))

app.set("view engine","ejs")
app.set('views', path.join(__dirname, 'views'))
app.set(express.static(path.join(__dirname,"public")))

app.use(express.static('public'));


app.use('/user', userRouter)
app.use('/admin', adminRouter)

app.listen(PORT,()=>{
    connectDB()
    console.log("server is running on port :",PORT)
})  



