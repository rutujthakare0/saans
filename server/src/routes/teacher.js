import { Router } from 'express';
import { randomBytes, createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Teacher from '../models/Teacher.js';
import School from '../models/School.js';
import Decision from '../models/Decision.js';
import ActionConfirmation from '../models/ActionConfirmation.js';
import { config } from '../config.js';
import { requireAuth } from '../middleware/auth.js';
import { authRateLimit } from '../middleware/publicRateLimit.js';

const router=Router();
const hash=value=>createHash('sha256').update(value).digest('hex');
const actionList=[['pe_indoors','PE and outdoor assembly moved indoors.'],['sensitive_students','Outdoor activity limited for sensitive students.'],['notice_sent','Parent notice sent.'],['outdoor_cancelled','Outdoor activities cancelled.']];
const todayFor=school=>new Date().toLocaleDateString('en-CA',{timeZone:school.timezone||'Asia/Kolkata'});

router.post('/invite',requireAuth,async(req,res)=>{
  const name=String(req.body.name||'').trim(), phone=String(req.body.phone||'').trim();
  if(name.length<2||name.length>80||phone.length>30)return res.status(400).json({error:'Enter a teacher name and optional phone number.'});
  if(await Teacher.exists({schoolId:req.school._id,name}))return res.status(409).json({error:'A teacher with this name already exists at this school; use a distinct name for sign-in.'});
  const token=randomBytes(32).toString('base64url');
  const teacher=await Teacher.create({schoolId:req.school._id,name,phone,passwordHash:'!',inviteTokenHash:hash(token),inviteExpiresAt:new Date(Date.now()+7*86400_000)});
  res.status(201).json({teacher_id:teacher._id,invite_url:`${config.publicBaseUrl.replace(/\/$/,'')}/teacher/activate?token=${token}`,expires_at:teacher.inviteExpiresAt});
});
router.get('/invite/:token',authRateLimit,async(req,res)=>{
  const teacher=await Teacher.findOne({inviteTokenHash:hash(req.params.token),inviteUsedAt:null,inviteExpiresAt:{$gt:new Date()}}).populate('schoolId','name');
  if(!teacher)return res.status(404).json({error:'Invite is invalid, expired, or already used.'});
  res.json({name:teacher.name,schoolName:teacher.schoolId.name});
});
router.post('/activate',authRateLimit,async(req,res)=>{
  const password=String(req.body.password||'');
  if(password.length<8||password.length>128)return res.status(400).json({error:'Password must be at least 8 characters.'});
  const passwordHash=await bcrypt.hash(password,12), now=new Date();
  const teacher=await Teacher.findOneAndUpdate({inviteTokenHash:hash(String(req.body.token||'')),inviteUsedAt:null,inviteExpiresAt:{$gt:now}},{$set:{passwordHash,inviteUsedAt:now,inviteTokenHash:null}},{new:true});
  if(!teacher)return res.status(404).json({error:'Invite is invalid, expired, or already used.'});
  res.json({token:jwt.sign({sub:teacher._id.toString(),role:'teacher',school_id:teacher.schoolId.toString(),teacher_id:teacher._id.toString()},config.jwtSecret,{expiresIn:'8h'}),role:'teacher'});
});
router.post('/login',authRateLimit,async(req,res)=>{
  const school=await School.findOne({slug:String(req.body.schoolSlug||'').trim().toLowerCase()});
  const teacher=school&&await Teacher.findOne({name:String(req.body.name||'').trim(),schoolId:school._id});
  if(!teacher||teacher.passwordHash==='!'||!(await bcrypt.compare(String(req.body.password||''),teacher.passwordHash)))return res.status(401).json({error:'Teacher name or password is incorrect.'});
  res.json({token:jwt.sign({sub:teacher._id.toString(),role:'teacher',school_id:teacher.schoolId.toString(),teacher_id:teacher._id.toString()},config.jwtSecret,{expiresIn:'8h'}),role:'teacher'});
});
async function requireTeacher(req,res,next){
  try{const token=req.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];if(!token)return res.status(401).json({error:'Sign in to continue.'});const payload=jwt.verify(token,config.jwtSecret);if(payload.role!=='teacher')return res.status(403).json({error:'Teacher access required.'});const teacher=await Teacher.findById(payload.sub);if(!teacher||teacher.passwordHash==='!')return res.status(401).json({error:'Teacher account not found.'});req.teacher=teacher;req.school=await School.findById(teacher.schoolId);if(!req.school)return res.status(401).json({error:'School not found.'});next();}catch{return res.status(401).json({error:'Teacher session expired. Sign in again.'});}
}
router.get('/today',requireTeacher,async(req,res)=>{
  const date=todayFor(req.school);
  const decision=await Decision.findOne({schoolId:req.school._id,date}).sort({checkedAt:-1});
  const confirmations=await ActionConfirmation.find({schoolId:req.school._id,teacherId:req.teacher._id,date}).sort({confirmedAt:1});
  res.json({date,schoolName:req.school.name,level:decision?.category||'Not checked',aqi:decision?.aqi??null,action:decision?.action||'normal',actions:actionList.map(([id,text])=>({id,text,confirmation:confirmations.find(item=>item.action===id)||null})),confirmed:confirmations.length,lastConfirmed:confirmations.at(-1)||null});
});
router.post('/confirm',requireTeacher,async(req,res)=>{
  const [id,text]=actionList.find(([key])=>key===req.body.action)||[];
  if(!id)return res.status(400).json({error:'Choose one of today’s listed actions.'});
  const date=todayFor(req.school);
  const result=await ActionConfirmation.findOneAndUpdate({schoolId:req.school._id,teacherId:req.teacher._id,action:id,date},{$setOnInsert:{schoolId:req.school._id,teacherId:req.teacher._id,action:id,date,actionText:text,confirmedAt:new Date()}},{upsert:true,new:true});
  res.status(201).json({confirmation:result});
});
router.get('/confirmations',requireAuth,async(req,res)=>{const date=todayFor(req.school);const rows=await ActionConfirmation.find({schoolId:req.school._id,date}).populate('teacherId','name').sort({confirmedAt:1});res.json({count:new Set(rows.map(row=>row.action)).size,confirmations:rows.map(row=>({action:row.action,actionText:row.actionText,confirmedAt:row.confirmedAt,teacher:row.teacherId?.name||'Teacher'}))});});
export { actionList };
export default router;
