import express from 'express';
import { getloginPage } from '../controllers/adminController.js';

const adminRouter = express.Router();


adminRouter.get('/login', getloginPage)


export default adminRouter;